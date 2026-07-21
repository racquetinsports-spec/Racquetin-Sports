// ── Cart store (shared) ──────────────────────────────────────────
// A single Zustand store so every component (Nav badge, CartDrawer,
// CartPage, ProductCard, ProductDetailPage) reads and writes the
// same cart state. Previously each screen called its own React hook
// with local useState, so adding an item from a ProductCard never
// updated the Nav badge or the (already-mounted) CartDrawer — this
// store is the fix for that.
//
// Backed by Supabase when logged in, localStorage when a guest (see
// lib/api/cart.js) — callers never need to know which.

import { create } from 'zustand';
import { fetchCart, addToCart, updateCartQty, removeFromCart, clearCart as apiClearCart } from '../lib/api/cart';
import { fetchProductsByIds } from '../lib/api/products';
import { normalizeProducts } from '../utils/normalizeProduct';
import { useUIStore } from './index';
import { trackAddToCart, trackRemoveFromCart } from '../lib/analytics';

function normalizeDbRow(row) {
  const p = row.products || {};
  const images = [...(p.product_images || [])]
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map(i => i.url);
  return {
    id: row.id,
    qty: row.qty,
    variant: row.variant || {},
    variantId: row.variant_id || null,
    variantInfo: row.product_variants ? { name: row.product_variants.name, value: row.product_variants.value, stock: row.product_variants.stock, isActive: row.product_variants.is_active } : null,
    product: p.id ? { id: p.id, name: p.name, price: p.price, series: p.series, brand: p.brand, images } : null,
  };
}

export const useCartStore = create((set, get) => ({
  items: [],
  source: 'local',
  loading: true,
  initialized: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const { data, source } = await fetchCart();
      const rows = data || [];

      if (source === 'db') {
        const items = rows.map(normalizeDbRow).filter(i => i.product);
        set({ items, source, loading: false, initialized: true });
        return;
      }

      // Guest rows only carry a productId — hydrate full product data
      // through the same Supabase-first product API every other page
      // uses (it falls back to local data internally only if Supabase
      // isn't configured at all).
      const { data: products } = await fetchProductsByIds(rows.map(r => r.productId));
      const byId = new Map(normalizeProducts(products).map(p => [p.id, p]));
      const items = rows
        .map(row => ({ id: row.key, qty: row.qty, variant: row.variant || {}, variantId: row.variantId || null, variantInfo: null, product: byId.get(row.productId) || null }))
        .filter(i => i.product);

      set({ items, source: source || 'local', loading: false, initialized: true });
    } catch (err) {
      console.warn('[RacquetIn] cart refresh failed, falling back to empty cart', err);
      set({ items: [], loading: false, initialized: true });
    }
  },

  addItem: async (product, variant = {}, qty = 1, variantId = null) => {
    useUIStore.getState().openCart();
    const { error } = await addToCart(product.id, qty, variant, variantId);
    if (!error) trackAddToCart(product, { quantity: qty, variant: variant?.color || variant?.grip || undefined });
    await get().refresh();
    return { error };
  },

  removeItem: async (id) => {
    // Look up the item's product/qty BEFORE it's gone — the store
    // won't have it anymore once refresh() below re-fetches the cart.
    const removed = get().items.find(i => i.id === id);
    await removeFromCart(id);
    if (removed?.product) trackRemoveFromCart(removed.product, { quantity: removed.qty, variant: removed.variant?.color || removed.variant?.grip || undefined });
    await get().refresh();
  },

  updateQty: async (id, qty) => {
    await updateCartQty(id, qty);
    await get().refresh();
  },

  clearCart: async () => {
    await apiClearCart();
    await get().refresh();
  },
}));
