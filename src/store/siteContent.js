// ── Site content/settings store (shared) ─────────────────────────
// Single source of truth for anything editable via the admin Content
// Management / Settings pages. Fetched once, shared across every
// storefront component that needs it (Footer, Homepage, About page,
// App-level color/SEO wiring). If a field isn't set in Supabase yet,
// callers fall back to the existing hardcoded copy — nothing on the
// storefront breaks just because a field is empty.

import { create } from 'zustand';
import { fetchSiteSettings } from '../lib/api/admin';
import { fetchAllContent } from '../lib/api/content';

export const useSiteContentStore = create((set) => ({
  settings: null,
  content: {},
  loading: true,
  initialized: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const [{ data: settings }, { data: content }] = await Promise.all([
        fetchSiteSettings(),
        fetchAllContent(),
      ]);
      set({ settings: settings || null, content: content || {}, loading: false, initialized: true });
    } catch (err) {
      console.warn('[RacquetIn] Could not load site settings/content — falling back to defaults.', err);
      set({ settings: null, content: {}, loading: false, initialized: true });
    }
  },
}));
