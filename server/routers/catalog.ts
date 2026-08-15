import { eq } from "drizzle-orm";
import { products } from "../../drizzle/schema";
import { getDb, getOrCreatePrimaryStore } from "../db";
import { router, publicProcedure } from "../_core/trpc";
import { catalog } from "../products";

export const catalogRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { store: { name: "Hearth & Halo · Downtown", address: "72 Aurora Street, New York, NY 10013", isOpen: true, pickupEnabled: true, deliveryEnabled: true, estimateMinutes: 22 }, products: catalog };
    const store = await getOrCreatePrimaryStore();
    const menu = await db.select().from(products).where(eq(products.storeId, store.id));
    return {
      store: { name: store.name, address: store.address, isOpen: store.isOpen, pickupEnabled: store.pickupEnabled, deliveryEnabled: store.deliveryEnabled, estimateMinutes: store.pickupEnabled ? 22 : 38 },
      products: menu.map(item => ({ ...(item.optionConfigJson as object), id: item.slug, name: item.name, description: item.description ?? "", category: item.category, basePriceCents: item.basePriceCents, available: item.isAvailable })),
    };
  }),
});
