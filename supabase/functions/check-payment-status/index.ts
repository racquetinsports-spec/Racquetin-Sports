// ── check-payment-status ──────────────────────────────────────────
// Purpose: the Razorpay Checkout modal's `ondismiss` event is
// ambiguous on mobile — it can mean a genuine cancel, but it can also
// fire when a NetBanking/OTP flow backgrounds the browser tab (common
// on mobile banking redirects) even though the payment is still being
// processed and will complete via the webhook moments later. Treating
// every dismiss as a hard failure was causing "redirected back to
// checkout" with no indication the payment actually succeeded.
//
// This function lets the frontend poll, briefly, whether the order
// was already fulfilled in the background (by verify-razorpay-payment
// or the webhook — whichever got there first) before showing a
// failure state. It never creates or verifies anything itself — it
// only reads payment_intents/payments, which have no client RLS
// access at all, so this is the only way the frontend can check.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user) return jsonResponse({ error: authError || 'Not authenticated' }, 401);

    const { provider_order_id } = await req.json();
    if (!provider_order_id) return jsonResponse({ error: 'provider_order_id is required' }, 400);

    const admin = getAdminClient();

    const { data: intent } = await admin
      .from('payment_intents')
      .select('user_id, status')
      .eq('provider_order_id', provider_order_id)
      .maybeSingle();

    if (!intent) return jsonResponse({ fulfilled: false });
    // Ownership check — a caller can only poll their own order's status.
    if (intent.user_id !== user.id) return jsonResponse({ error: 'This order does not belong to your account' }, 403);

    if (intent.status !== 'consumed') return jsonResponse({ fulfilled: false });

    const { data: payment } = await admin
      .from('payments')
      .select('order_id')
      .eq('provider_order_id', provider_order_id)
      .maybeSingle();

    return jsonResponse({ fulfilled: true, orderId: payment?.order_id || null });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
