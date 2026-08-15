import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "staff", "manager", "support", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 32 }),
  isOpen: boolean("isOpen").default(true).notNull(),
  pickupEnabled: boolean("pickupEnabled").default(true).notNull(),
  deliveryEnabled: boolean("deliveryEnabled").default(true).notNull(),
  deliveryFeeCents: int("deliveryFeeCents").default(499).notNull(),
  taxRateBasisPoints: int("taxRateBasisPoints").default(888).notNull(),
  hoursJson: json("hoursJson"),
  deliveryZonesJson: json("deliveryZonesJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["Pizzas", "Sides", "Drinks", "Desserts"]).notNull(),
  basePriceCents: int("basePriceCents").notNull(),
  imageUrl: text("imageUrl"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  optionConfigJson: json("optionConfigJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("products_store_slug_unique").on(table.storeId, table.slug)]);

export const productOptionGroups = mysqlTable("productOptionGroups", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  key: varchar("key", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  minSelections: int("minSelections").default(0).notNull(),
  maxSelections: int("maxSelections").default(1).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("option_groups_product_key_unique").on(table.productId, table.key)]);

export const productOptions = mysqlTable("productOptions", {
  id: int("id").autoincrement().primaryKey(),
  optionGroupId: int("optionGroupId").notNull(),
  slug: varchar("slug", { length: 96 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  priceDeltaCents: int("priceDeltaCents").default(0).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("options_group_slug_unique").on(table.optionGroupId, table.slug)]);

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  cartKey: varchar("cartKey", { length: 128 }).notNull().unique(),
  userId: int("userId"),
  storeId: int("storeId").notNull(),
  promotionCode: varchar("promotionCode", { length: 48 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull(),
  productSlug: varchar("productSlug", { length: 120 }).notNull(),
  configurationJson: json("configurationJson").notNull(),
  preparationNote: varchar("preparationNote", { length: 240 }),
  quantity: int("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  code: varchar("code", { length: 48 }).notNull(),
  type: mysqlEnum("type", ["percentage", "fixed"]).notNull(),
  value: int("value").notNull(),
  minSubtotalCents: int("minSubtotalCents").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("promotions_store_code_unique").on(table.storeId, table.code)]);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 24 }).notNull().unique(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull().unique(),
  storeId: int("storeId").notNull(),
  customerId: int("customerId"),
  guestName: varchar("guestName", { length: 160 }),
  guestEmail: varchar("guestEmail", { length: 320 }),
  guestPhone: varchar("guestPhone", { length: 32 }),
  fulfillmentMethod: mysqlEnum("fulfillmentMethod", ["delivery", "pickup"]).notNull(),
  deliveryAddressJson: json("deliveryAddressJson"),
  status: mysqlEnum("status", ["payment_pending", "confirmed", "preparing", "ready", "out for delivery", "completed", "cancelled"]).default("payment_pending").notNull(),
  estimateMinutes: int("estimateMinutes").notNull(),
  subtotalCents: int("subtotalCents").notNull(),
  discountCents: int("discountCents").default(0).notNull(),
  deliveryFeeCents: int("deliveryFeeCents").default(0).notNull(),
  taxCents: int("taxCents").default(0).notNull(),
  totalCents: int("totalCents").notNull(),
  promotionCode: varchar("promotionCode", { length: 48 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: varchar("productId", { length: 120 }).notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  configurationJson: json("configurationJson").notNull(),
  preparationNote: varchar("preparationNote", { length: 240 }),
  quantity: int("quantity").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  lineTotalCents: int("lineTotalCents").notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: varchar("status", { length: 64 }).notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 12 }).default("usd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const refunds = mysqlTable("refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  amountCents: int("amountCents").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  initiatedByUserId: int("initiatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderEvents = mysqlTable("orderEvents", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  oldStatus: varchar("oldStatus", { length: 32 }),
  newStatus: varchar("newStatus", { length: 32 }),
  actorType: mysqlEnum("actorType", ["customer", "staff", "system"]).notNull(),
  actorUserId: int("actorUserId"),
  metadataJson: json("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actorRole: varchar("actorRole", { length: 32 }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 120 }).notNull(),
  beforeJson: json("beforeJson"),
  afterJson: json("afterJson"),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  template: varchar("template", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["queued", "sent", "failed"]).default("queued").notNull(),
  providerReference: varchar("providerReference", { length: 255 }),
  failureReason: varchar("failureReason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
