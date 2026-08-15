import { ShopHeader } from "@/components/ShopHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCircle2, Loader2, ReceiptText } from "lucide-react";
import { Link } from "wouter";

const statusMessages: Record<string, string> = {
  confirmed: "Your order is confirmed and has joined the kitchen queue.",
  preparing: "Our kitchen is preparing your order now.",
  ready: "Your order is ready for pickup.",
  "out for delivery": "Your order is out for delivery.",
  completed: "Your order is completed. We hope you enjoyed it.",
  cancelled: "Your order was cancelled. Please contact the store if you need help.",
};

export default function OrderHistory() {
  const { user, loading } = useAuth();
  const orders = trpc.orders.mine.useQuery(undefined, { enabled: Boolean(user) });
  return <div className="cinema-app"><ShopHeader/><main className="page-shell"><p className="eyebrow">Your account</p><h1 className="page-title">PAST<br/><span>PERFECTION.</span></h1>{loading ? <div className="empty-panel"><Loader2 className="animate-spin"/> Loading your history</div> : !user ? <div className="empty-panel"><p>Sign in to see saved receipts and every order connected to your account.</p><button className="primary-button" onClick={() => startLogin()}>Sign in to view orders</button></div> : orders.isLoading ? <div className="empty-panel"><Loader2 className="animate-spin"/> Loading orders</div> : orders.data?.length ? <div className="mt-10 max-w-3xl space-y-6"><section className="summary-panel border-cyan-200/20"><div className="flex items-start gap-3"><BellRing className="text-[#87f2e8] shrink-0" size={19}/><div><p className="eyebrow">In-app notifications</p><h2 className="font-semibold mt-2">Order alerts</h2><div className="space-y-2 mt-3">{orders.data.filter(order => order.status !== "completed").slice(0, 3).map(order => <p key={order.id} className="text-sm text-white/65"><span className="text-[#87f2e8] font-mono text-xs mr-2">{order.publicId}</span>{statusMessages[order.status] ?? "Your order status has changed."}</p>)}</div></div></div></section>{orders.data.map(order => <article key={order.id} className="summary-panel"><div className="flex justify-between gap-4"><div><p className="eyebrow">{order.publicId}</p><h2 className="text-xl font-bold mt-2 capitalize">{order.status}</h2><p className="text-sm text-white/45 mt-1">{order.fulfillmentMethod} · {order.createdAt.toLocaleString()}</p></div><div className="text-right"><p className="text-[#87f2e8] text-lg font-bold">${(order.totalCents / 100).toFixed(2)}</p><p className="text-xs text-white/45 mt-2">Estimate {order.estimateMinutes} min</p></div></div><div className="flex gap-4 mt-5"><Link href="/track" className="text-[#87f2e8] text-xs inline-flex gap-2 items-center"><ReceiptText size={14}/> Tracking and receipt</Link></div></article>)}</div> : <div className="empty-panel"><CheckCircle2 className="text-[#87f2e8]"/><p>When you check out while signed in, your completed orders and receipts will appear here.</p><Link href="/" className="primary-button">Browse the menu</Link></div>}</main></div>;
}
