// ── razorpay-webhook ───────────────────────────────────────────────
// Public endpoint — Razorpay calls this directly, so there is no user
// JWT to check. Authentication here is entirely the webhook signature
// (X-Razorpay-Signature header, HMAC-SHA256 of the raw body against
// RAZORPAY_WEBHOOK_SECRET). Configure this URL + secret in the
// Razorpay Dashboard → Settings → Webhooks.
//
// Every event is logged to payment_events regardless of outcome —
// this is the audit trail for disputes and debugging. For
// payment.captured/authorized, this also acts as a safety net that
// fulfills the order even if the client never completed the
// verify-razorpay-payment call (e.g. closed the tab right after
// paying) — fulfillOrderFromIntent is idempotent either way.
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseClients.ts';
import { verifyWebhookSignature } from '../_shared/razorpay.ts';
import { fulfillOrderFromIntent } from '../_shared/fulfillOrder.ts';

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const signature = req.headers.get('X-Razorpay-Signature') || '';

  const validSignature = await verifyWebhookSignature({ rawBody, signature, secret: WEBHOOK_SECRET });
  if (!validSignature) {
    // Do not log the body of a request that failed signature checks —
    // it hasn't been authenticated as genuinely from Razorpay yet.
    return jsonResponse({ error: 'Invalid webhook signature' }, 401);
  }

  const admin = getAdminClient();
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const eventType: string = event.event;
  const paymentEntity = event.payload?.payment?.entity;
  const refundEntity = event.payload?.refund?.entity;
  const providerPaymentId = paymentEntity?.id || refundEntity?.payment_id || null;
  const providerOrderId = paymentEntity?.order_id || null;

  // Always log first — even if downstream processing fails, we still
  // have the raw event for later reconciliation.
  const { data: loggedEvent } = await admin.from('payment_events').insert([{
    provider: 'razorpay',
    provider_order_id: providerOrderId,
    provider_payment_id: providerPaymentId,
    event_type: eventType,
    payload: event,
    processed: false,
  }]).select().single();

  try {
    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      if (providerOrderId && providerPaymentId) {
        await fulfillOrderFromIntent({
          admin,
          providerOrderId,
          providerPaymentId,
          paymentMethod: paymentEntity?.method || null,
          rawPayment: paymentEntity,
        });
      }
    } else if (eventType === 'payment.failed') {
      if (providerOrderId) {
        // Record the failure; do NOT create an order, do NOT touch
        // inventory, do NOT touch the payment_intent (leave it
        // 'created' so the customer can retry the same cart).
        await admin.from('payments').insert([{
          order_id: null,
          customer_id: null,
          provider: 'razorpay',
          provider_order_id: providerOrderId,
          provider_payment_id: providerPaymentId,
          amount: paymentEntity?.amount || 0,
          currency: paymentEntity?.currency || 'INR',
          status: 'failed',
          signature_verified: true,
          raw_response: paymentEntity,
        }]);
      }
    } else if (eventType === 'refund.processed') {
      if (providerPaymentId) {
        const { data: existing } = await admin
          .from('payments')
          .select('id, amount, refunded_amount')
          .eq('provider_payment_id', providerPaymentId)
          .maybeSingle();

        if (existing) {
          const refundAmount = refundEntity?.amount || 0;
          const newRefundedTotal = (existing.refunded_amount || 0) + refundAmount;
          const isFullRefund = newRefundedTotal >= existing.amount;

          await admin.from('payments').update({
            status: isFullRefund ? 'refunded' : 'partially_refunded',
            refunded_amount: newRefundedTotal,
            refunded_at: new Date().toISOString(),
          }).eq('id', existing.id);

          const { data: paymentRow } = await admin.from('payments').select('order_id').eq('id', existing.id).single();
          if (paymentRow?.order_id) {
            await admin.from('orders').update({
              payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
            }).eq('id', paymentRow.order_id);
          }
        }
      }
    }

    if (loggedEvent?.id) {
      await admin.from('payment_events').update({ processed: true }).eq('id', loggedEvent.id);
    }
  } catch (err) {
    if (loggedEvent?.id) {
      await admin.from('payment_events').update({
        processed: false,
        processing_error: err instanceof Error ? err.message : 'Unknown processing error',
      }).eq('id', loggedEvent.id);
    }
    // Still return 200 — Razorpay retries on non-2xx, and retrying
    // won't fix an internal processing bug. The error is logged above
    // for manual investigation instead.
  }

  return jsonResponse({ received: true });
});
