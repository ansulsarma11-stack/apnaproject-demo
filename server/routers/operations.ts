import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auditEvents, orderEvents, orderItems, orders, payments, products, promotions, refunds, stores } from "../../drizzle/schema";
import { canTransitionOrder, customerStatuses } from "../commerce";
import { getDb, getOrCreatePrimaryStore, writeAudit } from "../db";
import { requireStripe } from "../stripe";
import { sendOrderStatusEmail } from "../notifications";
import { assertRefundRequest } from "../orderPolicies";
import { adminProcedure, router, staffProcedure } from "../_core/trpc";

const statusSchema = z.enum(customerStatuses);

function isStaffActor(role: string) {
  return role === "staff" || role === "manager" || role === "support" || role === "admin";
}

export const operationsRouter = router({
  queue: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
    return allOrders.filter(order => !["completed", "cancelled"].includes(order.status)).sort((a, b) => a.estimateMinutes - b.estimateMinutes || a.createdAt.getTime() - b.createdAt.getTime());
  }),
  detail: staffProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order data is unavailable." });
    const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    const [items, events] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId)),
      db.select().from(orderEvents).where(eq(orderEvents.orderId, input.orderId)).orderBy(desc(orderEvents.createdAt)),
    ]);
    return { order, items, events };
  }),
  transition: staffProcedure.input(z.object({ orderId: z.number().int().positive(), to: statusSchema, delayMessage: z.string().max(240).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order data is unavailable." });
    const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    if (!canTransitionOrder(order.status as typeof customerStatuses[number], input.to)) throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move an order from ${order.status} to ${input.to}.` });
    await db.update(orders).set({ status: input.to }).where(eq(orders.id, input.orderId));
    await db.insert(orderEvents).values({ orderId: input.orderId, eventType: input.delayMessage ? "delay_recorded" : "status_changed", oldStatus: order.status, newStatus: input.to, actorType: "staff", actorUserId: ctx.user.id, metadataJson: input.delayMessage ? { delayMessage: input.delayMessage } : undefined });
    if (order.guestEmail) await sendOrderStatusEmail({ orderId: input.orderId, recipient: order.guestEmail, publicId: order.publicId, status: input.delayMessage ? "delayed" : input.to, estimateMinutes: order.estimateMinutes });
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "order.status.update", entityType: "order", entityId: String(input.orderId), before: { status: order.status }, after: { status: input.to }, reason: input.delayMessage });
    return { success: true, status: input.to };
  }),
  recordDelay: staffProcedure.input(z.object({ orderId: z.number().int().positive(), message: z.string().trim().min(4).max(240) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order data is unavailable." });
    const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    if (["completed", "cancelled"].includes(order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "A completed or cancelled order cannot be delayed." });
    await db.insert(orderEvents).values({ orderId: order.id, eventType: "delay_recorded", oldStatus: order.status, newStatus: order.status, actorType: "staff", actorUserId: ctx.user.id, metadataJson: { delayMessage: input.message } });
    if (order.guestEmail) await sendOrderStatusEmail({ orderId: order.id, recipient: order.guestEmail, publicId: order.publicId, status: "delayed", estimateMinutes: order.estimateMinutes });
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "order.delay.record", entityType: "order", entityId: String(order.id), before: { status: order.status }, after: { status: order.status }, reason: input.message });
    return { success: true };
  }),
  capturePayment: staffProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order?.stripePaymentIntentId) throw new TRPCError({ code: "BAD_REQUEST", message: "No authorized payment is available to capture." });
    const intent = await requireStripe().paymentIntents.capture(order.stripePaymentIntentId);
    await db.update(payments).set({ status: intent.status }).where(eq(payments.orderId, order.id));
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "payment.capture", entityType: "order", entityId: String(order.id), after: { stripePaymentIntentId: intent.id, status: intent.status } });
    return { success: true, status: intent.status };
  }),
  initiateRefund: staffProcedure.input(z.object({ orderId: z.number().int().positive(), amountCents: z.number().int().min(50).optional(), reason: z.string().trim().min(8).max(500) })).mutation(async ({ ctx, input }) => {
    if (!isStaffActor(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order data is unavailable." });
    const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order?.stripePaymentIntentId) throw new TRPCError({ code: "BAD_REQUEST", message: "This order has no refundable payment." });
    const amount = input.amountCents ?? order.totalCents;
    try {
      assertRefundRequest({ orderTotalCents: order.totalCents, refundCents: amount, reason: input.reason });
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid refund request." });
    }
    const stripeRefund = await requireStripe().refunds.create({ payment_intent: order.stripePaymentIntentId, amount, metadata: { orderId: order.publicId, reason: input.reason } });
    await db.insert(refunds).values({ orderId: order.id, stripeRefundId: stripeRefund.id, amountCents: amount, reason: input.reason, status: stripeRefund.status ?? "pending", initiatedByUserId: ctx.user.id });
    await db.insert(orderEvents).values({ orderId: order.id, eventType: "refund_initiated", oldStatus: order.status, newStatus: order.status, actorType: "staff", actorUserId: ctx.user.id, metadataJson: { refundId: stripeRefund.id, amountCents: amount, reason: input.reason } });
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "refund.initiate", entityType: "order", entityId: String(order.id), after: { amountCents: amount, stripeRefundId: stripeRefund.id }, reason: input.reason });
    return { refundId: stripeRefund.id, status: stripeRefund.status };
  }),
  managerConfig: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { store: null, promotions: [] };
    const store = await getOrCreatePrimaryStore();
    const activePromotions = store ? await db.select().from(promotions).where(eq(promotions.storeId, store.id)) : [];
    return { store, promotions: activePromotions };
  }),
  updateStore: staffProcedure.input(z.object({ isOpen: z.boolean().optional(), pickupEnabled: z.boolean().optional(), deliveryEnabled: z.boolean().optional(), deliveryFeeCents: z.number().int().min(0).max(3000).optional(), hoursJson: z.record(z.string(), z.string()).optional(), deliveryZonesJson: z.array(z.string().trim().min(2).max(24)).max(30).optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const store = (await db.select().from(stores).limit(1))[0];
    if (!store) throw new TRPCError({ code: "NOT_FOUND", message: "Configure a store before changing operations." });
    await db.update(stores).set(input).where(eq(stores.id, store.id));
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "store.configuration.update", entityType: "store", entityId: String(store.id), before: store, after: input });
    return { success: true };
  }),
  upsertPromotion: staffProcedure.input(z.object({ code: z.string().trim().min(3).max(48), type: z.enum(["percentage", "fixed"]), value: z.number().int().min(1).max(100_000), minSubtotalCents: z.number().int().min(0).max(100_000).default(0), isActive: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const store = await getOrCreatePrimaryStore();
    const code = input.code.toUpperCase();
    const previous = (await db.select().from(promotions).where(eq(promotions.storeId, store.id)).limit(100)).find(promotion => promotion.code === code);
    if (previous) {
      await db.update(promotions).set({ type: input.type, value: input.value, minSubtotalCents: input.minSubtotalCents, isActive: input.isActive }).where(eq(promotions.id, previous.id));
    } else {
      await db.insert(promotions).values({ storeId: store.id, code, type: input.type, value: input.value, minSubtotalCents: input.minSubtotalCents, isActive: input.isActive });
    }
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "promotion.upsert", entityType: "promotion", entityId: code, before: previous, after: input });
    return { success: true };
  }),
  menu: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const store = await getOrCreatePrimaryStore();
    return db.select().from(products).where(eq(products.storeId, store.id));
  }),
  updateProduct: staffProcedure.input(z.object({ productId: z.number().int().positive(), basePriceCents: z.number().int().min(50).max(100_000).optional(), isAvailable: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const product = (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0];
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found." });
    const next = { basePriceCents: input.basePriceCents ?? product.basePriceCents, isAvailable: input.isAvailable ?? product.isAvailable };
    await db.update(products).set(next).where(eq(products.id, product.id));
    await writeAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: "product.update", entityType: "product", entityId: String(product.id), before: { basePriceCents: product.basePriceCents, isAvailable: product.isAvailable }, after: next });
    return { success: true };
  }),
  search: staffProcedure.input(z.object({ query: z.string().trim().min(2).max(120) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
    const query = input.query.toLowerCase();
    return allOrders.filter(order => order.publicId.toLowerCase().includes(query) || order.guestEmail?.toLowerCase().includes(query) || order.guestName?.toLowerCase().includes(query));
  }),
  audit: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
  }),
  report: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { orders: 0, grossSalesCents: 0, refundedCents: 0, cancelledOrders: 0, deliveryOrders: 0, pickupOrders: 0 };
    const [allOrders, allRefunds] = await Promise.all([db.select().from(orders).orderBy(desc(orders.createdAt)).limit(1000), db.select().from(refunds).limit(1000)]);
    return {
      orders: allOrders.length,
      grossSalesCents: allOrders.filter(order => order.status !== "cancelled").reduce((total, order) => total + order.totalCents, 0),
      refundedCents: allRefunds.filter(refund => refund.status !== "failed").reduce((total, refund) => total + refund.amountCents, 0),
      cancelledOrders: allOrders.filter(order => order.status === "cancelled").length,
      deliveryOrders: allOrders.filter(order => order.fulfillmentMethod === "delivery").length,
      pickupOrders: allOrders.filter(order => order.fulfillmentMethod === "pickup").length,
    };
  }),
});
