import { describe, expect, it } from "vitest";
import { calculateQuote, canTransitionOrder } from "./commerce";

const basePizza = {
  productId: "ember-margherita",
  quantity: 1,
  sizeId: "12",
  crustId: "neapolitan",
  sauceId: "san-marzano",
  cheeseId: "fior-di-latte",
  toppingIds: ["pepperoni"],
};

describe("pizza pricing", () => {
  it("calculates modifiers, promotion, delivery fee, and tax on the server", () => {
    const quote = calculateQuote({ items: [basePizza], fulfillmentMethod: "delivery", promotionCode: "FIRE10" });
    expect(quote.items[0]?.unitPriceCents).toBe(1920);
    expect(quote.subtotalCents).toBe(1920);
    expect(quote.discountCents).toBe(192);
    expect(quote.deliveryFeeCents).toBe(499);
    expect(quote.taxCents).toBe(198);
    expect(quote.totalCents).toBe(2425);
  });

  it("rejects non-configured promotion codes instead of silently changing the price", () => {
    expect(() => calculateQuote({ items: [basePizza], fulfillmentMethod: "pickup", promotionCode: "NOTREAL" })).toThrow("promotion code");
  });
});

describe("order status transitions", () => {
  it("allows only valid customer-facing transitions", () => {
    expect(canTransitionOrder("confirmed", "preparing")).toBe(true);
    expect(canTransitionOrder("preparing", "ready")).toBe(true);
    expect(canTransitionOrder("ready", "out for delivery")).toBe(false);
    expect(canTransitionOrder("completed", "cancelled")).toBe(false);
  });
});
