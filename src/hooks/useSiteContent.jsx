// ── useSiteContent hook ───────────────────────────────────────────
// Thin wrapper over store/siteContent.js. Use `pick(value, fallback)`
// wherever a storefront component reads editable copy/settings — it
// returns the live Supabase value only if it's actually set, so a
// blank/missing field never renders as empty text.

import { useEffect } from 'react';
import { useSiteContentStore } from '../store/siteContent';

export function useSiteContent() {
  const { settings, content, loading, initialized, refresh } = useSiteContentStore();

  useEffect(() => {
    if (!initialized) refresh();
  }, [initialized, refresh]);

  return { settings: settings || {}, content: content || {}, loading };
}

export function pick(value, fallback) {
  return (value !== undefined && value !== null && String(value).trim() !== '') ? value : fallback;
}
