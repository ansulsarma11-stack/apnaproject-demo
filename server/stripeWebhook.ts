import type { Express } from "express";
import express from "express";
import { eq } from "drizzle-orm";
import { orderEvents, orders, payments, refunds } from "../drizzle/schema";
import { getDb } from "./db";
import { requireStripe } from "./stripe";
import { sendOrderStatusEmail } from "./notifications";

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature) || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing Stripe signature." });
    }
    try {
      const event = requireStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable." });

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = Number(session.metadata?.orderId);
        if (orderId) {
          await db.update(orders).set({
            status: "confirmed",
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          }).where(eq(orders.id, orderId));
          await db.update(payments).set({
            status: "authorized",
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          }).where(eq(payments.orderId, orderId));
          await db.insert(orderEvents).values({ orderId, eventType: "status_changed", oldStatus: "payment_pending", newStatus: "confirmed", actorType: "system" });
          const confirmedOrder = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
          if (confirmedOrder?.guestEmail) await sendOrderStatusEmail({ orderId, recipient: confirmedOrder.guestEmail, publicId: confirmedOrder.publicId, status: "confirmed", estimateMinutes: confirmedOrder.estimateMinutes });
        }
      }
      if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.amount_capturable_updated") {
        const intent = event.data.object;
        const orderId = Number(intent.metadata.orderId);
        if (orderId) {
          await db.update(payments).set({ status: intent.status, stripePaymentIntentId: intent.id }).where(eq(payments.orderId, orderId));
          await db.insert(orderEvents).values({ orderId, eventType: intent.status === "succeeded" ? "payment_captured" : "payment_authorized", actorType: "system", metadataJson: { paymentStatus: intent.status, paymentIntentId: intent.id } });
        }
      }
      if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
        const intent = event.data.object;
        const metadataOrderId = Number(intent.metadata.orderId);
        if (metadataOrderId) await db.update(payments).set({ status: intent.status, stripePaymentIntentId: intent.id }).where(eq(payments.orderId, metadataOrderId));
        const failedOrder = metadataOrderId ? (await db.select().from(orders).where(eq(orders.id, metadataOrderId)).limit(1))[0] : (await db.select().from(orders).where(eq(orders.stripePaymentIntentId, intent.id)).limit(1))[0];
        if (failedOrder) await db.insert(orderEvents).values({ orderId: failedOrder.id, eventType: "payment_failed", oldStatus: failedOrder.status, newStatus: failedOrder.status, actorType: "system", metadataJson: { paymentStatus: intent.status } });
      }
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const expiredOrder = (await db.select().from(orders).where(eq(orders.stripeCheckoutSessionId, session.id)).limit(1))[0];
        if (expiredOrder) await db.insert(orderEvents).values({ orderId: expiredOrder.id, eventType: "checkout_expired", oldStatus: expiredOrder.status, newStatus: expiredOrder.status, actorType: "system" });
      }
      if (event.type === "refund.updated" || event.type === "refund.failed") {
        const refund = event.data.object;
        await db.update(refunds).set({ status: refund.status ?? "pending" }).where(eq(refunds.stripeRefundId, refund.id));
        const storedRefund = (await db.select().from(refunds).where(eq(refunds.stripeRefundId, refund.id)).limit(1))[0];
        if (storedRefund) await db.insert(orderEvents).values({ orderId: storedRefund.orderId, eventType: "refund_status_updated", actorType: "system", metadataJson: { refundId: refund.id, status: refund.status ?? "pending" } });
      }
      console.log("[Stripe webhook]", event.type, event.id);
      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe webhook] verification failed", error);
      return res.status(400).json({ error: "Invalid webhook payload." });
    }
  });
}
