// ── attach-guest-order ────────────────────────────────────────────
// POST body: { orderId: string }
// Requires: Authorization: Bearer <user's Supabase access token> —
// this is the one guest-checkout-related function that DOES hard-
// require real authentication, on purpose: it's the opposite case
// from the others. This only ever runs after someone has genuinely
// signed in, and only attaches an order to THEIR OWN account, which is
// how it satisfies the brief's explicit requirement: "Never associate
// an order merely because email strings match" / "Only attach a guest
// order to an existing account after appropriate authentication and
// verification." Matching email strings alone was never sufficient by
// itself — the requesting user must be authenticated AND their own
// verified account email must match the order's, not just a claim.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user) return jsonResponse({ error: authError || 'Not authenticated' }, 401);

    const { orderId } = (await req.json()) || {};
    if (!orderId || typeof orderId !== 'string') {
      return jsonResponse({ error: 'orderId is required' }, 400);
    }

    const admin = getAdminClient();
    const { data: order, error: fetchError } = await admin
      .from('orders')
      .select('id, user_id, shipping_address')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) return jsonResponse({ error: fetchError.message }, 500);
    if (!order) return jsonResponse({ error: 'Order not found' }, 404);

    // Already claimed — either by this same account (nothing to do) or
    // by someone else (never silently reassign).
    if (order.user_id) {
      return jsonResponse({ attached: order.user_id === user.id, alreadyAttached: true });
    }

    const orderEmail = (order.shipping_address as Record<string, string> | null)?.email?.trim().toLowerCase();
    const accountEmail = user.email?.trim().toLowerCase();
    if (!orderEmail || !accountEmail || orderEmail !== accountEmail) {
      // Deliberately generic — doesn't confirm or deny whether the
      // order exists under a different email, avoiding a secondary
      // enumeration surface on top of the one check-email-exists
      // already guards carefully.
      return jsonResponse({ error: 'This order cannot be added to your account.' }, 403);
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({ user_id: user.id })
      .eq('id', orderId)
      .is('user_id', null); // re-checked at update time too, not just at the read above — closes the gap between the two

    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    return jsonResponse({ attached: true, alreadyAttached: false });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
