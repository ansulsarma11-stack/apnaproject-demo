import { describe, expect, it } from "vitest";
import { assertRefundRequest } from "./orderPolicies";

describe("refund request policy", () => {
  it("requires a meaningful reason and keeps a valid partial refund within the order total", () => {
    expect(assertRefundRequest({ orderTotalCents: 2500, refundCents: 1250, reason: "Missing topping" })).toEqual({ orderTotalCents: 2500, refundCents: 1250, reason: "Missing topping" });
  });

  it("rejects a missing reason or an amount above the customer payment", () => {
    expect(() => assertRefundRequest({ orderTotalCents: 2500, refundCents: 1250, reason: "short" })).toThrow("reason");
    expect(() => assertRefundRequest({ orderTotalCents: 2500, refundCents: 2501, reason: "Customer request" })).toThrow("exceeds");
  });
});
