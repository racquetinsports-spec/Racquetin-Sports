// ── check-email-exists ────────────────────────────────────────────
// POST body: { email: string }
// Returns ONLY { exists: boolean } — no user id, no profile data, no
// account status (verified/disabled/banned all look identical from
// this endpoint's response). Checks the `customers` table (kept in
// sync with auth.users via the handle_new_user() trigger at signup)
// rather than auth.users directly, so this never touches that table
// at all, from the browser or otherwise.
//
// Rate limiting: NOT implemented here — flagged explicitly rather
// than faking it. A real per-IP/per-email throttle needs persistent
// storage (a counter table, or an edge-level service) that doesn't
// exist in this project yet. The response is deliberately minimal
// (a single boolean, nothing else) as the primary mitigation for now;
// real throttling is a genuine remaining gap, not a solved problem.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseClients.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { email: rawEmail } = (await req.json()) || {};
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: 'A valid email address is required' }, 400);
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from('customers')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ exists: !!data });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
