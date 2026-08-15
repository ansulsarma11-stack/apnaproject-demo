import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, auditEvents, orderEvents, orderItems, orders, payments, productOptionGroups, productOptions, products, stores, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { catalog } from "./products";
import { createExactlyOnce } from "./idempotency";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreatePrimaryStore() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const existing = await db.select().from(stores).limit(1);
  if (!existing[0]) {
    await db.insert(stores).values({
      slug: "hearth-and-halo-downtown",
      name: "Hearth & Halo · Downtown",
      address: "72 Aurora Street, New York, NY 10013",
      phone: "+1 212 555 0146",
    });
  }
  const store = existing[0] ?? (await db.select().from(stores).where(eq(stores.slug, "hearth-and-halo-downtown")).limit(1))[0];
  if (!store) throw new Error("Unable to initialize the primary store.");
  for (const product of catalog) {
    await db.insert(products).values({
      storeId: store.id,
      slug: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      basePriceCents: product.basePriceCents,
      isAvailable: product.available,
      optionConfigJson: product,
    }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
    const databaseProduct = (await db.select().from(products).where(eq(products.slug, product.id)).limit(1))[0];
    if (!databaseProduct) continue;
    const groups = [
      ["sizes", "Size", product.sizes, true, 1, 1],
      ["crusts", "Crust", product.crusts, true, 1, 1],
      ["sauces", "Sauce", product.sauces, true, 1, 1],
      ["cheeses", "Cheese", product.cheeses, true, 1, 1],
      ["toppings", "Toppings", product.toppings, false, 0, 8],
    ] as const;
    for (const [key, label, options, isRequired, minSelections, maxSelections] of groups) {
      if (!options?.length) continue;
      await db.insert(productOptionGroups).values({ productId: databaseProduct.id, key, label, isRequired, minSelections, maxSelections }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      const group = (await db.select().from(productOptionGroups).where(eq(productOptionGroups.productId, databaseProduct.id)).limit(20)).find(value => value.key === key);
      if (!group) continue;
      for (let index = 0; index < options.length; index += 1) {
        const option = options[index];
        if (!option) continue;
        await db.insert(productOptions).values({ optionGroupId: group.id, slug: option.id, label: option.label, priceDeltaCents: option.priceDeltaCents, displayOrder: index }).onDuplicateKeyUpdate({ set: { label: option.label, priceDeltaCents: option.priceDeltaCents, updatedAt: new Date() } });
      }
    }
  }
  return store;
}

export async function createOrderRecord(input: {
  publicId: string;
  idempotencyKey: string;
  customerId?: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress?: Record<string, string>;
  quote: Awaited<ReturnType<typeof import("./commerce").calculateQuote>>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const store = await getOrCreatePrimaryStore();
  const result = await createExactlyOnce({
    findExisting: async () => (await db.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1))[0],
    create: async () => {
      const insertion = await db.insert(orders).values({
      publicId: input.publicId,
      idempotencyKey: input.idempotencyKey,
      storeId: store.id,
      customerId: input.customerId,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      fulfillmentMethod: input.fulfillmentMethod,
      deliveryAddressJson: input.deliveryAddress,
      estimateMinutes: input.quote.estimatedMinutes,
      subtotalCents: input.quote.subtotalCents,
      discountCents: input.quote.discountCents,
      deliveryFeeCents: input.quote.deliveryFeeCents,
      taxCents: input.quote.taxCents,
      totalCents: input.quote.totalCents,
      promotionCode: input.quote.promotionApplied,
      });
      const createdOrder = (await db.select().from(orders).where(eq(orders.id, Number(insertion[0].insertId))).limit(1))[0];
      if (!createdOrder) throw new Error("Order creation did not complete.");
      return createdOrder;
    },
  });
  if (!result.created) return { order: result.value, created: false };
  const orderId = result.value.id;
  await db.insert(orderItems).values(input.quote.items.map(item => ({
    orderId,
    productId: item.productId,
    productName: item.productName,
    configurationJson: item.selections,
    preparationNote: item.note,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.lineTotalCents,
  })));
  await db.insert(payments).values({ orderId, status: "created", amountCents: input.quote.totalCents });
  await db.insert(orderEvents).values({ orderId, eventType: "order_created", newStatus: "payment_pending", actorType: input.customerId ? "customer" : "system", actorUserId: input.customerId });
  return { order: result.value, created: true };
}

export async function writeAudit(input: {
  actorUserId?: number;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeJson: input.before,
    afterJson: input.after,
    reason: input.reason,
  });
}

export async function getRecentOrders(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}
