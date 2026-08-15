import { OrderSummary } from "@/components/OrderSummary";
import { ShopHeader } from "@/components/ShopHeader";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, CheckCircle2, MapPin, PackageCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

function createAttemptKey() { const existing = sessionStorage.getItem("pizza-checkout-attempt"); if (existing) return existing; const key = crypto.randomUUID(); sessionStorage.setItem("pizza-checkout-attempt", key); return key; }

export default function Checkout() {
  const { items, promotionCode } = useCart();
  const [, setLocation] = useLocation();
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", city: "New York", postalCode: "10013" });
  const checkout = trpc.orders.startCheckout.useMutation({ onError: error => toast.error(error.message) });
  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
  const pay = async () => {
    if (!items.length) return setLocation("/");
    const result = await checkout.mutateAsync({
      idempotencyKey: createAttemptKey(),
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.phone || undefined,
      fulfillmentMethod: fulfillment,
      deliveryAddress: fulfillment === "delivery" ? { line1: form.line1, city: form.city, postalCode: form.postalCode } : undefined,
      promotionCode: promotionCode || undefined,
      items: items.map(line => ({ productId: line.product.id, quantity: line.quantity, sizeId: line.sizeId, crustId: line.crustId, sauceId: line.sauceId, cheeseId: line.cheeseId, toppingIds: line.toppingIds, note: line.note })),
    });
    if (result.checkoutUrl) { window.open(result.checkoutUrl, "_blank"); toast.success("Secure payment opened in a new tab."); }
    setLocation(`/confirmation?order=${result.orderId}&eta=${result.estimateMinutes}`);
  };
  if (!items.length) return <div className="cinema-app"><ShopHeader/><main className="page-shell"><div className="empty-panel"><p>Your cart is empty.</p><Link href="/" className="primary-button">Build an order</Link></div></main></div>;
  return <div className="cinema-app"><ShopHeader/><main className="page-shell"><Link href="/cart" className="back-link"><ArrowLeft size={15}/> Back to cart</Link><div className="checkout-grid"><section><p className="eyebrow">Checkout</p><h1 className="page-title">THE LAST<br/><span>GOOD DECISION.</span></h1><div className="checkout-card"><div className="checkout-step"><span>01</span><div><h3>How should it arrive?</h3><p>Delivery reaches the Downtown service area. Pickup is ready at our kitchen counter.</p></div></div><div className="fulfillment-toggle"><button className={fulfillment === "delivery" ? "active" : ""} onClick={() => setFulfillment("delivery")}><MapPin size={17}/> Delivery <small>~38 min</small></button><button className={fulfillment === "pickup" ? "active" : ""} onClick={() => setFulfillment("pickup")}><PackageCheck size={17}/> Pickup <small>~22 min</small></button></div></div><div className="checkout-card"><div className="checkout-step"><span>02</span><div><h3>Your details</h3><p>We use these only to fulfill this order and send essential updates.</p></div></div><div className="form-grid"><label>Name<input value={form.name} onChange={event => update("name", event.target.value)} placeholder="Your name"/></label><label>Email<input value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com" type="email"/></label><label className="form-wide">Phone <small>optional</small><input value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="(212) 555-0123"/></label>{fulfillment === "delivery" && <><label className="form-wide">Street address<input value={form.line1} onChange={event => update("line1", event.target.value)} placeholder="72 Aurora Street"/></label><label>City<input value={form.city} onChange={event => update("city", event.target.value)} /></label><label>ZIP code<input value={form.postalCode} onChange={event => update("postalCode", event.target.value)} /></label></>}</div></div><div className="checkout-card review-card"><div className="checkout-step"><span>03</span><div><h3>Secure payment</h3><p>Your final pricing and menu availability are confirmed on our server before Stripe opens.</p></div></div><button disabled={checkout.isPending} className="primary-button full" onClick={pay}>{checkout.isPending ? "Preparing secure checkout…" : <>Continue to secure payment <ArrowUpRight size={16}/></>}</button><p className="payment-note"><CheckCircle2 size={14}/> Payment is processed securely by Stripe. A separate browser tab will open.</p></div></section><aside><OrderSummary items={items} fulfillment={fulfillment} promotionCode={promotionCode}/></aside></div></main></div>;
}
