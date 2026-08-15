import { ShopHeader } from "@/components/ShopHeader";
import { CheckCircle2, Clock3, ExternalLink, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Confirmation() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const order = params.get("order") || "HH-ORDER";
  const eta = params.get("eta") || "22";
  return <div className="cinema-app"><ShopHeader/><main className="confirmation-shell"><div className="confirmation-glow"/><CheckCircle2 size={42} className="text-cyan-300"/><p className="eyebrow mt-6">Payment window launched</p><h1>YOU’RE IN<br/><span>THE QUEUE.</span></h1><p className="max-w-md mx-auto text-white/60 leading-7">We have reserved <strong className="text-white">{order}</strong>. Complete secure payment in the Stripe tab, then this order will move into production.</p><div className="confirmation-details"><div><Clock3 size={18}/><span>Estimated {eta} minutes</span></div><div><MapPin size={18}/><span>Hearth & Halo · Downtown</span></div></div><div className="hero-actions justify-center"><Link href="/track" className="primary-button">Track this order <ExternalLink size={15}/></Link><Link href="/" className="text-button">Back to menu <span>↗</span></Link></div></main></div>;
}
