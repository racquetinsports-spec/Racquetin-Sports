// ── useCart hook ──────────────────────────────────────────────────
// Thin wrapper over the shared store (store/cart.js) — ensures the
// store is initialized once, and derives total/count. All state is
// shared across every component that calls this hook.

import { useEffect } from 'react';
import { useCartStore } from '../store/cart';

export function useCart() {
  const { items, loading, initialized, addItem, removeItem, updateQty, clearCart, refresh } = useCartStore();

  useEffect(() => {
    if (!initialized) refresh();
  }, [initialized, refresh]);

  return {
    items,
    loading,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    refresh,
    total: items.reduce((s, i) => s + i.product.price * i.qty, 0),
    count: items.reduce((s, i) => s + i.qty, 0),
  };
}
