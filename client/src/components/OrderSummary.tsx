import { type CartLine } from "@/contexts/CartContext";
import { localCartTotals, linePrice, optionLabel } from "@/lib/cart";
import { formatMoney } from "@/data/menu";

export function configurationSummary(line: CartLine) {
  const core = [optionLabel(line, "sizes", line.sizeId), optionLabel(line, "crusts", line.crustId), optionLabel(line, "sauces", line.sauceId), optionLabel(line, "cheeses", line.cheeseId)].filter(Boolean);
  const toppings = line.toppingIds.map(id => line.product.toppings?.find(option => option.id === id)?.label).filter(Boolean);
  return [...core, ...toppings].join(" · ") || "House recipe";
}

export function OrderSummary({ items, fulfillment, promotionCode, compact = false }: { items: CartLine[]; fulfillment: "delivery" | "pickup"; promotionCode?: string; compact?: boolean }) {
  const totals = localCartTotals(items, fulfillment, promotionCode);
  return <div className={compact ? "space-y-3" : "summary-panel"}>
    {!compact && <p className="eyebrow">Your order</p>}
    <div className="space-y-4">
      {items.map(line => <div key={line.id} className="flex gap-3"><div className={`mini-orb orb-${line.product.image}`}/><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="font-semibold text-sm text-white">{line.quantity}× {line.product.name}</p><p className="text-sm text-white">{formatMoney(linePrice(line))}</p></div><p className="text-xs leading-5 text-white/50">{configurationSummary(line)}</p>{line.note && <p className="text-xs leading-5 text-cyan-200/80">“{line.note}”</p>}</div></div>)}
    </div>
    <div className="summary-totals">
      <div><span>Subtotal</span><span>{formatMoney(totals.subtotalCents)}</span></div>
      {totals.discountCents > 0 && <div className="text-cyan-200"><span>FIRE10</span><span>−{formatMoney(totals.discountCents)}</span></div>}
      <div><span>{fulfillment === "delivery" ? "Delivery" : "Pickup"}</span><span>{totals.deliveryFeeCents ? formatMoney(totals.deliveryFeeCents) : "Included"}</span></div>
      <div><span>Taxes</span><span>{formatMoney(totals.taxCents)}</span></div>
      <div className="summary-grand"><span>Total</span><span>{formatMoney(totals.totalCents)}</span></div>
    </div>
  </div>;
}
