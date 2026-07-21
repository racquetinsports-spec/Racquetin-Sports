// ── Wishlist store (shared) ──────────────────────────────────────
// Same pattern as store/cart.js — one shared store so the Nav badge,
// the wishlist heart on a ProductCard, and the Wishlist page all
// stay in sync instead of each holding an isolated copy.

import { create } from 'zustand';
import { fetchWishlist, toggleWishlist } from '../lib/api/wishlist';
import { trackAddToWishlist, trackRemoveFromWishlist } from '../lib/analytics';

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

  // `product` is optional — passing it (ProductCard/PDP already have
  // the full product object at their call sites) enables a richer
  // add_to_wishlist/remove_from_wishlist event; omitting it just skips
  // tracking for that call, it never breaks the actual toggle.
  toggle: async (id, product) => {
    const wasWished = get().ids.includes(id);
    await toggleWishlist(id);
    if (product) {
      if (wasWished) trackRemoveFromWishlist(product);
      else trackAddToWishlist(product);
    }
    await get().refresh();
  },
}));
