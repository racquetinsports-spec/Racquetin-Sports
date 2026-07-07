// ── Supabase Client ───────────────────────────────────────────────
// Single instance shared across the entire app.
// Credentials are read ONLY from environment variables — no fallback
// values, no placeholder host. If either is missing, this throws at
// import time instead of silently creating a client that points at
// a fake host (which is what was masking a misconfigured .env).
//
// Usage:
//   import { supabase } from '@/lib/supabase'
//   const { data, error } = await supabase.from('products').select('*')

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[RacquetIn] Missing Supabase environment variables.\n' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set.\n\n' +
    'Checklist if you have a .env with real values and still see this:\n' +
    '  1. The .env file must live in the project root (same folder as package.json/vite.config.js), not in src/.\n' +
    '  2. Vite only reads .env at server startup — restart `npm run dev` after creating/editing it.\n' +
    '  3. Variable names must be exactly VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (case-sensitive, no quotes needed around the value).\n' +
    '  4. Check for a stray .env.local or .env.development that might be overriding .env.\n' +
    `Currently read: VITE_SUPABASE_URL=${JSON.stringify(supabaseUrl)}, VITE_SUPABASE_ANON_KEY=${supabaseKey ? '[present]' : JSON.stringify(supabaseKey)}`
  );
}

if (import.meta.env.DEV) {
  // Only the URL — never log the anon key, even though it's public-safe,
  // to keep the habit of not printing credentials to the console.
  console.log('[RacquetIn] Supabase URL loaded:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
});

// Kept for callers that still branch on this (now always true, since the
// module throws above otherwise) — safe to call, never false at runtime.
export const isSupabaseConfigured = () => true;
