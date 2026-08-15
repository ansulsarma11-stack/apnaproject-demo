import { ShopHeader } from "@/components/ShopHeader";
import { ArrowRight, BellRing, Check, CircleDotDashed, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { trpc } from "@/lib/trpc";

const statuses = ["confirmed", "preparing", "ready", "out for delivery", "completed", "cancelled"] as const;

export default function Tracking() {
  const [publicId, setPublicId] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const input = { publicId, email };
  const tracking = trpc.orders.track.useQuery(input, { enabled: submitted && Boolean(publicId && email), retry: false });
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(false); window.setTimeout(() => setSubmitted(true), 0); };
  const rawStatus = tracking.data?.order.status ?? "confirmed";
  const status = rawStatus === "payment_pending" ? "confirmed" : rawStatus;
  return <div className="cinema-app"><ShopHeader/><main className="tracking-shell"><p className="eyebrow">Order tracking</p><h1>FOLLOW THE<br/><span>FIRE.</span></h1><p className="tracking-intro">Enter your order reference and email for a live, plain-language status history.</p><form className="tracking-form" onSubmit={submit}><input required value={publicId} onChange={event => setPublicId(event.target.value.toUpperCase())} placeholder="Order reference, e.g. HH-ABC1234"/><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Order email"/><button className="primary-button">Find my order <ArrowRight size={16}/></button></form>{tracking.isFetching && <div className="tracking-result"><Loader2 className="animate-spin text-cyan-300"/> Looking for your order…</div>}{tracking.error && <p className="tracking-error">{tracking.error.message}</p>}{tracking.data && <div className="tracking-result"><div className="tracking-heading"><div><p className="eyebrow">{tracking.data.order.publicId}</p><h2>{status}</h2></div><p className="text-right text-sm text-white/55">Estimated {tracking.data.order.estimateMinutes} minutes<br/>from confirmation</p></div><ol className="status-timeline">{statuses.map((label, index) => { const done = statuses.indexOf(status as typeof statuses[number]) >= index && status !== "cancelled"; const current = label === status; return <li key={label} className={current ? "current" : done ? "done" : ""}><span>{done ? <Check size={14}/> : <CircleDotDashed size={14}/>}</span><div><strong>{label}</strong><p>{current ? "This is where your order is now." : done ? "Completed." : "Waiting ahead."}</p></div></li>; })}</ol>{tracking.data.notifications.length > 0 && <section className="mt-8 border-t border-white/10 pt-5"><div className="flex gap-2 items-center text-[#87f2e8]"><BellRing size={15}/><p className="eyebrow">Notification history</p></div><div className="mt-3 space-y-2">{tracking.data.notifications.slice(-5).reverse().map(notification => <p key={notification.id} className="text-sm text-white/60"><span className="capitalize text-white">{notification.template}</span> update recorded <span className="text-white/35">· {notification.createdAt.toLocaleString()}</span></p>)}</div></section>}</div>}</main></div>;
}
