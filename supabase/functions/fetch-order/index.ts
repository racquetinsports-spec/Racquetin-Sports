// ── fetch-order ────────────────────────────────────────────────────
// Resolves a single order for display, for BOTH registered and guest
// customers, through one consistent path — rather than relying on the
// client's direct RLS-gated query, which works fine for a logged-in
// owner but can never work for a guest: orders_own's policy is
// `user_id = auth.uid()`, and a guest has no auth.uid() at all
// (it's NULL, and NULL = NULL is not true in Postgres) — so a guest
// would see a blank/failed confirmation page immediately after paying,
// every single time, with no way to fix it from the client side alone.
//
// POST body: { orderId: string }
// Authorization header is optional — sent automatically by the
// Supabase client if the visitor happens to be logged in, absent for
// a genuine guest.
//
// Authorization model:
//   - Logged in, and this order's user_id matches: allowed.
//   - Not logged in, and this order has NO user_id (a real guest
//     order): allowed. The order id itself is a v4 UUID — 122 bits of
//     randomness, not realistically guessable — so knowing it (from
//     the post-checkout redirect, which is the only place it's ever
//     handed out) is treated as sufficient proof of ownership, the
//     same "capability URL" pattern Stripe/Shopify use for their own
//     guest confirmation pages.
//   - Anything else (wrong owner, or a guest trying to view a
//     registered order): a generic not-found, never a distinguishing
//     "wrong owner" vs "doesn't exist" response.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { orderId } = (await req.json()) || {};
    if (!orderId || typeof orderId !== 'string') {
      return jsonResponse({ error: 'orderId is required' }, 400);
    }

    const { user } = await getRequestUser(req); // null for a guest — not an error case here
    const admin = getAdminClient();

    const { data: order, error } = await admin
      .from('orders')
      .select(`*, order_items(*, product:product_id(name, slug, brand, category_slug, product_images(url, is_primary))), payments(*), shipments(*)`)
      .eq('id', orderId)
      .maybeSingle();

    if (error) return jsonResponse({ error: error.message }, 500);

    const authorized = order && (
      (user && order.user_id === user.id) ||
      (!user && order.user_id === null)
    );

    // Same response either way — an order that exists but isn't yours
    // shouldn't be distinguishable from one that doesn't exist at all.
    if (!authorized) return jsonResponse({ data: null, error: null });

    return jsonResponse({ data: order, error: null });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
