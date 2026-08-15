import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ArrowUpRight, MapPin, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "wouter";

export function ShopHeader() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const [location] = useLocation();
  const darkLink = "text-white/65 hover:text-white";
  return <header className="shop-header">
    <Link href="/" className="brand"><span className="brand-mark">F</span><span>FOODIES</span></Link>
    <nav className="hidden md:flex items-center gap-7 text-[11px] tracking-[0.16em] font-semibold uppercase">
      <Link href="/" className={location === "/" ? "text-white" : darkLink}>Menu</Link>
      <Link href="/track" className={location === "/track" ? "text-white" : darkLink}>Track order</Link>
      <Link href="/ops" className={darkLink}>Studio</Link>
    </nav>
    <div className="flex items-center gap-3">
      <span className="hidden lg:flex items-center gap-2 text-[11px] text-white/55"><MapPin size={14} className="text-cyan-300"/>Downtown, NYC</span>
      {user ? <Link href="/orders" className="hidden sm:inline text-[10px] uppercase tracking-[.14em] text-white/65 hover:text-white">Orders</Link> : <button onClick={() => startLogin()} className="hidden sm:inline text-[10px] uppercase tracking-[.14em] text-white/65 hover:text-white">Sign in</button>}
      <Link href="/cart" className="cart-link" aria-label="View shopping cart"><ShoppingBag size={17}/><span className="hidden sm:inline">Cart</span><b>{itemCount}</b><ArrowUpRight size={13} className="opacity-60"/></Link>
    </div>
  </header>;
}
