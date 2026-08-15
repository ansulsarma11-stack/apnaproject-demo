import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { notifications, orderEvents, orderItems, orders, payments } from "../../drizzle/schema";
import { calculateQuote, cartItemSchema, orderQuoteSchema } from "../commerce";
import { createOrderRecord, getDb, getOrCreatePrimaryStore } from "../db";
import { requireStripe } from "../stripe";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

const checkoutInput = orderQuoteSchema.extend({
  idempotencyKey: z.string().min(12).max(128),
  guestName: z.string().trim().min(2).max(160),
  guestEmail: z.string().email(),
  guestPhone: z.string().trim().max(32).optional(),
  deliveryAddress: z.object({
    line1: z.string().trim().min(4),
    city: z.string().trim().min(2),
    postalCode: z.string().trim().min(4).max(12),
  }).optional(),
});

function toError(error: unknown) {
  return new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to process the order." });
}

export const orderRouter = router({
  quote: publicProcedure.input(orderQuoteSchema).query(({ input }) => {
    try {
      return calculateQuote(input);
    } catch (error) {
      throw toError(error);
    }
  }),
  startCheckout: publicProcedure.input(checkoutInput).mutation(async ({ ctx, input }) => {
    if (input.fulfillmentMethod === "delivery" && !input.deliveryAddress) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A delivery address is required for delivery orders." });
    }
    if (input.deliveryAddress && !/^10\d{3}(-\d{4})?$/.test(input.deliveryAddress.postalCode)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This delivery address is outside the current service area." });
    }
    try {
      const quote = calculateQuote(input);
      const record = await createOrderRecord({
        publicId: `HH-${nanoid(7).toUpperCase()}`,
        idempotencyKey: input.idempotencyKey,
        customerId: ctx.user?.id,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        fulfillmentMethod: input.fulfillmentMethod,
        deliveryAddress: input.deliveryAddress,
        quote,
      });
      if (!record.created && record.order.status !== "payment_pending") return { orderId: record.order.publicId, checkoutUrl: null, estimateMinutes: record.order.estimateMinutes, duplicate: true };
      if (!record.created && record.order.stripeCheckoutSessionId) {
        const priorSession = await requireStripe().checkout.sessions.retrieve(record.order.stripeCheckoutSessionId);
        if (priorSession.status === "open" && priorSession.url) return { orderId: record.order.publicId, checkoutUrl: priorSession.url, estimateMinutes: record.order.estimateMinutes, duplicate: true };
        if (priorSession.payment_status === "paid") return { orderId: record.order.publicId, checkoutUrl: null, estimateMinutes: record.order.estimateMinutes, duplicate: true };
      }
      const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
      const stripeClient = requireStripe();
      const internalCoupon = quote.discountCents ? await stripeClient.coupons.create({
        amount_off: quote.discountCents,
        currency: "usd",
        duration: "once",
        name: quote.promotionApplied ?? "Promotion",
        metadata: { orderId: record.order.id.toString(), publicOrderId: record.order.publicId },
      }) : null;
      const session = await stripeClient.checkout.sessions.create({
        mode: "payment",
        client_reference_id: ctx.user?.id ? ctx.user.id.toString() : undefined,
        customer_email: input.guestEmail,
        success_url: `${origin}/confirmation?order=${record.order.publicId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?payment=cancelled`,
        allow_promotion_codes: !internalCoupon,
        discounts: internalCoupon ? [{ coupon: internalCoupon.id }] : undefined,
        metadata: {
          orderId: record.order.id.toString(),
          publicOrderId: record.order.publicId,
          user_id: ctx.user?.id?.toString() ?? "guest",
          customer_email: input.guestEmail,
          customer_name: input.guestName,
        },
        payment_intent_data: { capture_method: "manual", metadata: { orderId: record.order.id.toString(), publicOrderId: record.order.publicId } },
        line_items: [
          ...quote.items.map(item => ({
            quantity: item.quantity,
            price_data: { currency: "usd", unit_amount: item.unitPriceCents, product_data: { name: item.productName, description: item.selections.map(selection => selection.label).join(" · ") || undefined } },
          })),
          ...(quote.deliveryFeeCents ? [{ quantity: 1, price_data: { currency: "usd", unit_amount: quote.deliveryFeeCents, product_data: { name: "Delivery" } } }] : []),
          ...(quote.taxCents ? [{ quantity: 1, price_data: { currency: "usd", unit_amount: quote.taxCents, product_data: { name: "Tax" } } }] : []),
        ],
      }, { idempotencyKey: `${record.order.publicId}-${record.created ? input.idempotencyKey : nanoid(16)}` });
      const db = await getDb();
      if (db) {
        await db.update(orders).set({ stripeCheckoutSessionId: session.id }).where(eq(orders.id, record.order.id));
        await db.update(payments).set({ status: "checkout_created" }).where(eq(payments.orderId, record.order.id));
      }
      return { orderId: record.order.publicId, checkoutUrl: session.url, estimateMinutes: quote.estimatedMinutes, duplicate: false };
    } catch (error) {
      throw toError(error);
    }
  }),
  track: publicProcedure.input(z.object({ publicId: z.string().min(4), email: z.string().email() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order data is unavailable." });
    const order = (await db.select().from(orders).where(eq(orders.publicId, input.publicId)).limit(1))[0];
    if (!order || order.guestEmail?.toLowerCase() !== input.email.toLowerCase()) throw new TRPCError({ code: "NOT_FOUND", message: "We could not find that order." });
    const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const statusNotifications = await db.select().from(notifications).where(eq(notifications.orderId, order.id));
    return { order, events, items, notifications: statusNotifications };
  }),
  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(orders).where(eq(orders.customerId, ctx.user.id));
  }),
  createDemoTracking: publicProcedure.input(z.object({ items: z.array(cartItemSchema).min(1) })).mutation(async ({ input }) => {
    const quote = calculateQuote({ items: input.items, fulfillmentMethod: "pickup" });
    const record = await createOrderRecord({ publicId: `HH-${nanoid(7).toUpperCase()}`, idempotencyKey: nanoid(28), guestName: "Guest customer", guestEmail: "guest@example.com", fulfillmentMethod: "pickup", quote });
    return { publicId: record.order.publicId };
  }),
});
