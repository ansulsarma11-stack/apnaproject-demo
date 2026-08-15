import { z } from "zod";
import { catalogById, type ProductOption } from "./products";

export const customerStatuses = ["confirmed", "preparing", "ready", "out for delivery", "completed", "cancelled"] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(12),
  sizeId: z.string().optional(),
  crustId: z.string().optional(),
  sauceId: z.string().optional(),
  cheeseId: z.string().optional(),
  toppingIds: z.array(z.string()).max(8).default([]),
  note: z.string().max(240).optional(),
});

export const orderQuoteSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(24),
  fulfillmentMethod: z.enum(["delivery", "pickup"]),
  promotionCode: z.string().trim().max(32).optional(),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type OrderQuoteInput = z.infer<typeof orderQuoteSchema>;

function resolveOption(options: ProductOption[] | undefined, id: string | undefined, field: string) {
  if (!options) return undefined;
  if (!id) throw new Error(`${field} is required for this pizza.`);
  const option = options.find(value => value.id === id);
  if (!option) throw new Error(`Selected ${field.toLowerCase()} is unavailable.`);
  return option;
}

function money(value: number) {
  return Math.round(value);
}

export function calculateQuote(input: OrderQuoteInput) {
  const items = input.items.map(item => {
    const product = catalogById.get(item.productId);
    if (!product || !product.available) throw new Error("One or more menu items are unavailable.");

    let unitPriceCents = product.basePriceCents;
    const selections: { group: string; label: string; priceDeltaCents: number }[] = [];
    const optionGroups = [
      [product.sizes, item.sizeId, "Size"],
      [product.crusts, item.crustId, "Crust"],
      [product.sauces, item.sauceId, "Sauce"],
      [product.cheeses, item.cheeseId, "Cheese"],
    ] as const;
    for (const [options, id, label] of optionGroups) {
      const option = resolveOption(options, id, label);
      if (option) {
        unitPriceCents += option.priceDeltaCents;
        selections.push({ group: label, label: option.label, priceDeltaCents: option.priceDeltaCents });
      }
    }
    const selectedToppings = item.toppingIds.map(id => {
      const topping = product.toppings?.find(value => value.id === id);
      if (!topping) throw new Error("A selected topping is unavailable.");
      unitPriceCents += topping.priceDeltaCents;
      return { group: "Topping", label: topping.label, priceDeltaCents: topping.priceDeltaCents };
    });

    return {
      ...item,
      productId: product.id,
      productName: product.name,
      image: product.image,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.quantity,
      selections: [...selections, ...selectedToppings],
    };
  });

  const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  const code = input.promotionCode?.trim().toUpperCase();
  if (code && code !== "FIRE10") throw new Error("That promotion code is invalid or unavailable.");
  const discountCents = code === "FIRE10" ? money(subtotalCents * 0.1) : 0;
  const deliveryFeeCents = input.fulfillmentMethod === "delivery" ? 499 : 0;
  const taxableCents = Math.max(0, subtotalCents - discountCents + deliveryFeeCents);
  const taxCents = money(taxableCents * 0.08875);
  return {
    items,
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    taxCents,
    totalCents: subtotalCents - discountCents + deliveryFeeCents + taxCents,
    promotionApplied: discountCents > 0 ? code : null,
    estimatedMinutes: input.fulfillmentMethod === "delivery" ? 38 : 22,
  };
}

const transitionMap: Record<CustomerStatus, CustomerStatus[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "out for delivery", "cancelled"],
  ready: ["completed", "cancelled"],
  "out for delivery": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(from: CustomerStatus, to: CustomerStatus) {
  return transitionMap[from].includes(to);
}
