export function assertRefundRequest(input: { orderTotalCents: number; refundCents: number; reason: string }) {
  const reason = input.reason.trim();
  if (reason.length < 8) throw new Error("A refund reason of at least 8 characters is required.");
  if (!Number.isInteger(input.refundCents) || input.refundCents < 50) throw new Error("Refund amount must be at least $0.50.");
  if (input.refundCents > input.orderTotalCents) throw new Error("Refund amount exceeds the order total.");
  return { ...input, reason };
}
