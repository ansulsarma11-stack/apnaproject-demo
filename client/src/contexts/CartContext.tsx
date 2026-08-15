import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { type MenuProduct } from "@/data/menu";

export type CartLine = {
  id: string;
  product: MenuProduct;
  quantity: number;
  sizeId?: string;
  crustId?: string;
  sauceId?: string;
  cheeseId?: string;
  toppingIds: string[];
  note?: string;
};

type CartContextValue = {
  items: CartLine[];
  promotionCode: string;
  addItem: (line: Omit<CartLine, "id">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setPromotionCode: (code: string) => void;
  clearCart: () => void;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "hearth-halo-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [promotionCode, setPromotionCode] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { items?: CartLine[]; promotionCode?: string };
        setItems(parsed.items ?? []);
        setPromotionCode(parsed.promotionCode ?? "");
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify({ items, promotionCode }));
  }, [items, promotionCode, hydrated]);

  const value = useMemo(() => ({
    items,
    promotionCode,
    addItem: (line: Omit<CartLine, "id">) => setItems(current => [...current, { ...line, id: crypto.randomUUID() }]),
    updateQuantity: (id: string, quantity: number) => setItems(current => quantity < 1 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, quantity: Math.min(12, quantity) } : item)),
    removeItem: (id: string) => setItems(current => current.filter(item => item.id !== id)),
    setPromotionCode,
    clearCart: () => { setItems([]); setPromotionCode(""); },
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
  }), [items, promotionCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
