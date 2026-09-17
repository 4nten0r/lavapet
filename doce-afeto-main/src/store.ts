import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import type { Product } from './types';

export type CartLine = { product_id: string; name: string; price_cents: number; image_url: string; unit: string; quantity: number; stock: number };
const savedCart = z.object({ items: z.array(z.object({ product_id: z.uuid(), name: z.string().max(90), price_cents: z.number().int().positive().max(100000), image_url: z.string().max(1500), unit: z.string().max(60), quantity: z.number().int().min(1).max(50), stock: z.number().int().nonnegative().max(10000) })).max(30) });
type CartStore = {
  items: CartLine[]; add: (p: Product, quantity?: number) => boolean;
  setQuantity: (id: string, quantity: number) => void; remove: (id: string) => void;
  reconcile: (products: Product[]) => void; clear: () => void;
};
export const useCart = create<CartStore>()(persist((set, get) => ({
  items: [],
  add: (p, quantity = 1) => {
    const items = get().items, old = items.find(i => i.product_id === p.id);
    if ((old?.quantity ?? 0) + quantity > Math.min(p.stock, 50) || !p.available || (!old && items.length >= 30)) return false;
    set({ items: old ? items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + quantity, price_cents: p.price_cents, stock: p.stock } : i) : [...items, { product_id: p.id, name: p.name, price_cents: p.price_cents, image_url: p.image_url, unit: p.unit, quantity, stock: p.stock }] });
    return true;
  },
  setQuantity: (id, quantity) => set(s => ({ items: s.items.map(i => i.product_id === id ? { ...i, quantity: Math.min(50, i.stock, Math.max(1, quantity)) } : i) })),
  remove: id => set(s => ({ items: s.items.filter(i => i.product_id !== id) })),
  reconcile: products => set(s => ({ items: s.items.flatMap(i => {
    const p = products.find(p => p.id === i.product_id);
    return p && p.stock > 0 ? [{ ...i, name: p.name, image_url: p.image_url, price_cents: p.price_cents, stock: p.stock, quantity: Math.min(i.quantity, p.stock), unit: p.unit }] : [];
  }) })),
  clear: () => set({ items: [] }),
}), { name: 'doce-afeto-cart-v1', partialize: s => ({ items: s.items }), merge: (saved, current) => {
  const parsed = savedCart.safeParse(saved);
  if (!parsed.success || new Set(parsed.data.items.map(i => i.product_id)).size !== parsed.data.items.length) return current;
  return { ...current, items: parsed.data.items };
} }));
export const cartTotal = (items: CartLine[]) => items.reduce((sum, i) => sum + i.quantity * i.price_cents, 0);
export const cartCount = (items: CartLine[]) => items.reduce((sum, i) => sum + i.quantity, 0);
type UiStore = { cartOpen: boolean; authOpen: boolean; setCartOpen: (open: boolean) => void; setAuthOpen: (open: boolean) => void };
export const useUi = create<UiStore>(set => ({ cartOpen: false, authOpen: false, setCartOpen: cartOpen => set({ cartOpen }), setAuthOpen: authOpen => set({ authOpen }) }));
