import { OrderSummary, configurationSummary } from "@/components/OrderSummary";
import { ShopHeader } from "@/components/ShopHeader";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/data/menu";
import { linePrice } from "@/lib/cart";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Cart() {
  const { items, promotionCode, setPromotionCode, updateQuantity, removeItem } = useCart();
  const [, setLocation] = useLocation();
  return <div className="cinema-app"><ShopHeader/><main className="page-shell"><div className="page-kicker">Your table is waiting</div><div className="two-column"><section><p className="eyebrow">Cart</p><h1 className="page-title">THE NIGHT,<br/><span>CURATED.</span></h1>{items.length === 0 ? <div className="empty-panel"><p>Your cart is ready for an idea.</p><Link href="/" className="primary-button">Return to menu <ArrowRight size={16}/></Link></div> : <div className="cart-lines">{items.map(line => <article key={line.id} className="cart-line"><div className={`cart-art orb-${line.product.image}`}/><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h3>{line.product.name}</h3><strong>{formatMoney(linePrice(line))}</strong></div><p>{configurationSummary(line)}</p>{line.note && <p className="note-copy">“{line.note}”</p>}<div className="cart-line-actions"><div className="quantity-control"><button onClick={() => updateQuantity(line.id, line.quantity - 1)}><Minus size={14}/></button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.id, line.quantity + 1)}><Plus size={14}/></button></div><button className="muted-action" onClick={() => removeItem(line.id)}><Trash2 size={14}/> Remove</button></div></div></article>)}</div>}</section><aside className="space-y-5">{items.length > 0 && <><div className="promo-panel"><p className="eyebrow">Offer code</p><div><input aria-label="Discount code" placeholder="Try FIRE10" value={promotionCode} onChange={event => setPromotionCode(event.target.value.toUpperCase())}/><span>{promotionCode.toUpperCase() === "FIRE10" ? "10% applied" : ""}</span></div></div><OrderSummary items={items} fulfillment="delivery" promotionCode={promotionCode}/><button className="primary-button full" onClick={() => setLocation("/checkout")}>Continue to checkout <ArrowRight size={16}/></button><p className="text-center text-xs text-white/45">Final total is recalculated securely before payment.</p></>}</aside></div></main></div>;
}
