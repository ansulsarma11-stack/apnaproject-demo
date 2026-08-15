import { type CartLine } from "@/contexts/CartContext";

const optionPrice = (options: { id: string; priceDeltaCents: number }[] | undefined, id: string | undefined) => options?.find(option => option.id === id)?.priceDeltaCents ?? 0;

export function linePrice(line: CartLine) {
  const product = line.product;
  const modifierTotal = optionPrice(product.sizes, line.sizeId) + optionPrice(product.crusts, line.crustId) + optionPrice(product.sauces, line.sauceId) + optionPrice(product.cheeses, line.cheeseId) + line.toppingIds.reduce((sum, id) => sum + optionPrice(product.toppings, id), 0);
  return (product.basePriceCents + modifierTotal) * line.quantity;
}

export function localCartTotals(items: CartLine[], fulfillment: "delivery" | "pickup", promotionCode?: string) {
  const subtotalCents = items.reduce((total, line) => total + linePrice(line), 0);
  const discountCents = promotionCode?.trim().toUpperCase() === "FIRE10" ? Math.round(subtotalCents * 0.1) : 0;
  const deliveryFeeCents = fulfillment === "delivery" ? 499 : 0;
  const taxCents = Math.round(Math.max(0, subtotalCents - discountCents + deliveryFeeCents) * 0.08875);
  return { subtotalCents, discountCents, deliveryFeeCents, taxCents, totalCents: subtotalCents - discountCents + deliveryFeeCents + taxCents };
}

export function optionLabel(line: CartLine, group: "sizes" | "crusts" | "sauces" | "cheeses", id?: string) {
  return line.product[group]?.find(option => option.id === id)?.label;
}
