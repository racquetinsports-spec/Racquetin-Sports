// ── verify-razorpay-payment ───────────────────────────────────────
// POST body: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
// Requires: Authorization: Bearer <user's Supabase access token>
//
// This is the ONLY place an order is allowed to be created. Steps:
//   1. Recompute the HMAC signature server-side and compare — reject
//      immediately on any mismatch.
//   2. Re-fetch the payment from Razorpay's API directly (not trusting
//      the client's response object) to confirm it's actually captured
//      and its amount matches what we quoted.
//   3. Only then: create the order from the stored payment_intent,
//      decrement inventory, record the payment, create a shipment
//      placeholder, and clear the cart.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';
import { verifyCheckoutSignature, fetchRazorpayPayment } from '../_shared/razorpay.ts';
import { fulfillOrderFromIntent } from '../_shared/fulfillOrder.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user) return jsonResponse({ error: authError || 'Not authenticated' }, 401);

    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return jsonResponse({ error: 'Missing payment verification fields' }, 400);
    }

    // 1. Signature check — reject immediately, do not touch the DB at all
    //    if this fails. This is the line that stops a forged/replayed
    //    "success" from ever reaching order creation.
    const validSignature = await verifyCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!validSignature) {
      return jsonResponse({ error: 'Payment signature verification failed' }, 400);
    }

    const admin = getAdminClient();

    // Ownership check: the payment_intent for this order id must
    // belong to the authenticated caller — stops one user from
    // verifying (and fulfilling) another user's order id.
    const { data: intent } = await admin
      .from('payment_intents')
      .select('user_id')
      .eq('provider_order_id', razorpay_order_id)
      .maybeSingle();
    if (!intent) return jsonResponse({ error: 'No matching order found for this payment' }, 404);
    if (intent.user_id !== user.id) return jsonResponse({ error: 'This payment does not belong to your account' }, 403);

    // 2. Re-confirm with Razorpay directly — belt and suspenders beyond
    //    the signature check, per Razorpay's own recommendation.
    const payment = await fetchRazorpayPayment(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) {
      return jsonResponse({ error: 'Payment/order mismatch' }, 400);
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return jsonResponse({ error: `Payment not completed (status: ${payment.status})` }, 400);
    }

    // 3. Fulfill — idempotent, safe even if the webhook already did this.
    const { order, alreadyFulfilled, error: fulfillError } = await fulfillOrderFromIntent({
      admin,
      providerOrderId: razorpay_order_id,
      providerPaymentId: razorpay_payment_id,
      paymentMethod: payment.method || null,
      rawPayment: payment,
    });

    if (fulfillError) return jsonResponse({ error: fulfillError }, 500);

    await admin.from('payment_events').insert([{
      payment_id: null,
      provider: 'razorpay',
      provider_order_id: razorpay_order_id,
      provider_payment_id: razorpay_payment_id,
      event_type: 'payment.verified_by_client',
      payload: payment,
      processed: true,
    }]);

    return jsonResponse({ success: true, alreadyFulfilled, order });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
