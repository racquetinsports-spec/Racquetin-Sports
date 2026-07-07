// ── Wishlist store (shared) ──────────────────────────────────────
// Same pattern as store/cart.js — one shared store so the Nav badge,
// the wishlist heart on a ProductCard, and the Wishlist page all
// stay in sync instead of each holding an isolated copy.

import { create } from 'zustand';
import { fetchWishlist, toggleWishlist } from '../lib/api/wishlist';

export const useWishlistStore = create((set, get) => ({
  ids: [],
  loading: true,
  initialized: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const { data } = await fetchWishlist();
      const ids = (data || []).map(row => (typeof row === 'object' && row !== null ? row.product_id : row));
      set({ ids, loading: false, initialized: true });
    } catch (err) {
      console.warn('[RacquetIn] wishlist refresh failed, falling back to empty wishlist', err);
      set({ ids: [], loading: false, initialized: true });
    }
  },

  toggle: async (id) => {
    await toggleWishlist(id);
    await get().refresh();
  },
}));
