// ── Supabase clients for Edge Functions ──────────────────────────
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically
// injected by the Supabase platform into every Edge Function's
// runtime environment — you do not need to set these yourself via
// `supabase secrets set` (doing so is harmless but redundant).
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Full-privilege client — bypasses RLS entirely. Only ever used
// server-side, never returned or exposed to the caller.
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Resolves the calling user from the request's own JWT (the
// anon-key client the frontend already authenticated with) — this is
// how each Edge Function knows *who* is checking out without ever
// trusting a user id the client could have sent in the request body.
export async function getRequestUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { user: null, error: 'Missing Authorization header' };

  const client = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return { user: null, error: error?.message || 'Not authenticated' };
  return { user: data.user, error: null };
}
