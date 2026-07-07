import { create } from 'zustand';

// ── UI Store ─────────────────────────────────────────────────────
// Cart/wishlist DATA now lives in useCart()/useWishlist() (hooks/),
// backed by Supabase when logged in and localStorage as a guest
// (see lib/api/cart.js, lib/api/wishlist.js). This store only holds
// ephemeral UI state that should never be persisted.
export const useUIStore = create((set) => ({
  searchOpen: false,
  searchQuery: '',
  megaMenu: null,
  cartOpen: false,

  openSearch:  () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  setQuery:    (q) => set({ searchQuery: q }),
  setMegaMenu: (m) => set({ megaMenu: m }),

  openCart:   () => set({ cartOpen: true }),
  closeCart:  () => set({ cartOpen: false }),
  toggleCart: () => set(s => ({ cartOpen: !s.cartOpen })),
}));
