// ── attach-my-guest-orders ────────────────────────────────────────
// POST body: (none needed — acts on the authenticated caller only)
// Requires: Authorization: Bearer <user's Supabase access token>
//
// Companion to attach-guest-order (which claims one specific order by
// id, used right after signing up through that order's own
// confirmation page). This one is broader and doesn't need to know
// any order id at all: it finds every unclaimed guest order whose
// shipping_address email matches the caller's own verified account
// email, and claims all of them at once. This is what actually
// handles "I placed a guest order, then created an account totally
// separately, unrelated to that order" — the specific-order flow can
// only ever fire if someone signs up through that exact order's own
// link, so it was never going to catch this case on its own.
//
// Same authorization model as attach-guest-order: real session
// required, and only ever matches the CALLER's own verified email —
// never a bare string claim from the request body.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user || !user.email) return jsonResponse({ error: authError || 'Not authenticated' }, 401);

    const accountEmail = user.email.trim().toLowerCase();
    const admin = getAdminClient();

    // Filtered in JS rather than via a Postgres-side case-insensitive
    // query — shipping_address.email is raw, unnormalized user input
    // from the checkout form (never forced to lowercase the way
    // guest_email on payment_intents is), so a case-sensitive DB-side
    // match could easily miss a real match over something as trivial
    // as capitalization. Scans every currently-unclaimed guest order;
    // fine at this store's present scale — would want pagination or a
    // dedicated index if that table grows very large.
    const { data: candidates, error: fetchError } = await admin
      .from('orders')
      .select('id, shipping_address')
      .is('user_id', null);

    if (fetchError) return jsonResponse({ error: fetchError.message }, 500);

    const matchingIds = (candidates || [])
      .filter(o => (o.shipping_address as Record<string, string> | null)?.email?.trim().toLowerCase() === accountEmail)
      .map(o => o.id);

    if (matchingIds.length === 0) return jsonResponse({ attachedCount: 0 });

    const { error: updateError } = await admin
      .from('orders')
      .update({ user_id: user.id })
      .in('id', matchingIds)
      .is('user_id', null); // re-checked at update time, closing the same race-condition gap attach-guest-order guards against

    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    return jsonResponse({ attachedCount: matchingIds.length });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
