// ── useWishlist hook ──────────────────────────────────────────────
// Thin wrapper over the shared store (store/wishlist.js).

import { useEffect } from 'react';
import { useWishlistStore } from '../store/wishlist';

export function useWishlist() {
  const { ids, loading, initialized, toggle, refresh } = useWishlistStore();

  useEffect(() => {
    if (!initialized) refresh();
  }, [initialized, refresh]);

  return {
    ids,
    loading,
    has: (id) => ids.includes(id),
    toggle,
    refresh,
  };
}
