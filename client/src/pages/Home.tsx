import { ShopHeader } from "@/components/ShopHeader";
import { useCart } from "@/contexts/CartContext";
import { formatMoney, starterMenu, type MenuProduct } from "@/data/menu";
import { linePrice } from "@/lib/cart";
import { trpc } from "@/lib/trpc";
import { Check, ChevronDown, Flame, Leaf, Minus, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const categories = ["Pizzas", "Sides", "Drinks", "Desserts"] as const;

function SelectionGroup({ title, values, selected, onChange, multiple = false }: { title: string; values?: { id: string; label: string; priceDeltaCents: number }[]; selected?: string | string[]; onChange: (value: string) => void; multiple?: boolean }) {
  if (!values?.length) return null;
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return <section className="customizer-section"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-white">{title}</p><span className="text-[10px] tracking-[.16em] text-white/45 uppercase">{multiple ? "Optional" : "Required"}</span></div><div className="choice-grid">{values.map(value => { const active = selectedValues.includes(value.id); return <button key={value.id} onClick={() => onChange(value.id)} className={`choice-chip ${active ? "active" : ""}`}><span>{value.label}</span>{value.priceDeltaCents > 0 && <small>+{formatMoney(value.priceDeltaCents)}</small>}{active && <Check size={13}/>}</button>; })}</div></section>;
}

function PizzaCustomizer({ product, close }: { product: MenuProduct; close: () => void }) {
  const { addItem } = useCart();
  const [, setLocation] = useLocation();
  const [sizeId, setSizeId] = useState<string>();
  const [crustId, setCrustId] = useState<string>();
  const [sauceId, setSauceId] = useState<string>();
  const [cheeseId, setCheeseId] = useState<string>();
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { setSizeId(product.sizes?.[0]?.id); setCrustId(product.crusts?.[0]?.id); setSauceId(product.sauces?.[0]?.id); setCheeseId(product.cheeses?.[0]?.id); setToppingIds([]); setNote(""); }, [product.id]);

  const draft = { id: "draft", product, quantity, sizeId, crustId, sauceId, cheeseId, toppingIds, note };
  const canAdd = !product.sizes || Boolean(sizeId && crustId && sauceId && cheeseId);
  const toggleTopping = (id: string) => setToppingIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const addToCart = () => { if (!canAdd) return; addItem({ product, quantity, sizeId, crustId, sauceId, cheeseId, toppingIds, note }); close(); setLocation("/cart"); };

  return <div className="customizer-overlay" role="dialog" aria-modal="true" aria-label={`Customize ${product.name}`}><div className="customizer-shell"><div className="customizer-top"><button className="icon-button" onClick={close}><X size={18}/></button><div><p className="eyebrow">Build your pizza</p><h2>{product.name}</h2></div><p className="text-right font-bold text-lg">{formatMoney(linePrice(draft))}</p></div><div className="customizer-body"><div className={`customizer-product orb-${product.image}`}><span className="product-number">0{starterMenu.findIndex(item => item.id === product.id) + 1}</span><div><p className="text-xs uppercase tracking-[.2em] text-white/60">Handmade tonight</p><p className="text-sm text-white/70 max-w-xs mt-2">{product.description}</p></div></div><div className="customizer-form"><SelectionGroup title="Size" values={product.sizes} selected={sizeId} onChange={setSizeId}/><SelectionGroup title="Crust" values={product.crusts} selected={crustId} onChange={setCrustId}/><SelectionGroup title="Sauce" values={product.sauces} selected={sauceId} onChange={setSauceId}/><SelectionGroup title="Cheese" values={product.cheeses} selected={cheeseId} onChange={setCheeseId}/><SelectionGroup title="Finish with toppings" values={product.toppings} selected={toppingIds} onChange={toggleTopping} multiple/><section className="customizer-section"><label className="text-sm font-semibold text-white">Preparation note <span className="ml-1 text-white/45 font-normal">optional</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={240} placeholder="e.g. cut into squares" /></label><div className="flex items-center justify-between mt-4"><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={14}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(value => Math.min(12, value + 1))}><Plus size={14}/></button></div><button className="primary-button" disabled={!canAdd} onClick={addToCart}>Add to cart <span>{formatMoney(linePrice(draft))}</span></button></div></section></div></div></div></div>;
}

export default function Home() {
  const { data } = trpc.catalog.list.useQuery();
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("Pizzas");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [, setLocation] = useLocation();
  const products = (data?.products as MenuProduct[] | undefined) ?? starterMenu;
  const visibleProducts = useMemo(() => products.filter(product => product.category === activeCategory), [products, activeCategory]);

  return <div className="cinema-app"><ShopHeader/><main><section className="hero-shell"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><p className="eyebrow hero-eyebrow"><Sparkles size={13}/> Wood-fired expression</p><h1>FULL TIME<br/><span>AVAILABILITY</span></h1><p className="hero-subtitle">Modern pizza built in the glow of a live fire. Precise ingredients, fearless flavor, made to order in Downtown.</p><div className="hero-actions"><button className="primary-button" onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>MENU <ChevronDown size={16}/></button><button className="text-button" onClick={() => setLocation("/track")}>Track an order <span>↗</span></button></div><div className="hero-statline"><span><Flame size={14}/> Open now</span><i/><span>Pickup in 22 min</span><i/><span>Delivery in 38 min</span></div></section><section id="menu" className="menu-shell"><div className="section-heading"><div><p className="eyebrow">The menu</p></div><p className="section-copy">Every expression starts with long-fermented dough and finishes in our 900° stone oven.</p></div><div className="category-tabs" role="tablist">{categories.map((category, index) => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? "active" : ""}><span>0{index + 1}</span>{category}</button>)}</div><div className="product-grid">{visibleProducts.map((product, index) => <article key={product.id} className={`product-card product-${product.image}`}><div className="product-visual"><span className="product-number">0{index + 1}</span>{product.image === "green" && <Leaf size={20} className="absolute right-6 top-6 text-cyan-200"/>}<div className="visual-grain"/></div><div className="product-info"><div className="flex justify-between gap-5"><h3>{product.name}</h3><strong>{formatMoney(product.basePriceCents)}</strong></div><p>{product.description}</p><div className="mt-6 flex items-center justify-between"><span className={product.available ? "availability" : "availability sold"}>{product.available ? "Available now" : "Sold out"}</span><button disabled={!product.available} className="add-button" onClick={() => setSelected(product)}>Customize <Plus size={15}/></button></div></div></article>)}</div></section></main>{selected && <PizzaCustomizer product={selected} close={() => setSelected(null)}/>}</div>;
}
