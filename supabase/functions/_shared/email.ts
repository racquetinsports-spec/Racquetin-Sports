// ── Order confirmation email (Resend) ─────────────────────────────
// FROM_EMAIL is read from the EMAIL_FROM Edge Function secret — set it
// to your verified Resend domain's sender (e.g.
// "RacquetIn Sports <orders@yourdomain.com>"). The hardcoded fallback
// below is Resend's own shared sandbox sender, which is ALWAYS
// restricted to sending only to your own account email regardless of
// any domain verified elsewhere in the account — verifying a domain
// does nothing by itself; this variable has to actually be set to use
// it. If you see the sandbox-fallback warning in the logs, EMAIL_FROM
// is missing or misspelled as a secret.
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SANDBOX_FALLBACK_FROM = 'RacquetIn <onboarding@resend.dev>';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') || SANDBOX_FALLBACK_FROM;
const REPLY_TO_EMAIL = Deno.env.get('ORDER_EMAIL_REPLY_TO') || 'racquetinsports@gmail.com';

if (FROM_EMAIL === SANDBOX_FALLBACK_FROM) {
  // Loud, not silent — this exact gap (env var never set, code quietly
  // falls back to a sender that can only email the account owner) is
  // what caused every email to fail after the domain was verified.
  console.error('[email] EMAIL_FROM is not set — falling back to the Resend sandbox sender, which can only send to your own account email. Set EMAIL_FROM as an Edge Function secret to use your verified domain.');
}

// ── Currency contract ────────────────────────────────────────────
// This codebase does NOT use one uniform unit for money — and that's
// intentional, not an oversight (see create-razorpay-order/index.ts
// for the full explanation):
//   - order_items.price is plain RUPEES — a direct, unconverted
//     snapshot of products.price.
//   - orders.total/subtotal/tax/shipping_cost and payments.amount ARE
//     paise — converted once, at the Razorpay boundary.
// Two distinctly-named formatters instead of one generic one, so a
// caller can't accidentally apply the wrong conversion without it
// being visually obvious in the code. This is exactly the bug that
// shipped before: formatRupees(item.price) treated an already-rupee
// value as paise, silently dividing a ₹13,500 racket down to ₹135
// while the (correctly paise) order total displayed fine right next
// to it.
function formatINR(amountInRupees: number): string {
  return '₹' + Math.round(amountInRupees).toLocaleString('en-IN');
}
function formatINRFromPaise(amountInPaise: number): string {
  return formatINR(amountInPaise / 100);
}

// ── Centralized idempotent send ────────────────────────────────────
// Every email in this file should be sent through this wrapper, not by
// calling Resend directly. It's the one place that: claims a
// deterministic idempotency key via email_log's UNIQUE constraint
// BEFORE sending (so a retried webhook/verification call can't send
// twice), records the outcome durably, and captures Resend's own
// message id for future reference (e.g. an admin resend/status tool).
//
// `send` is the actual Resend call, deferred until after the
// idempotency claim succeeds — if the insert fails on the unique
// constraint, `send` is never invoked at all.
export async function sendEmailIdempotent({
  admin, idempotencyKey, emailType, recipient, customerId, orderId, shipmentId, send,
}: {
  admin: SupabaseClient;
  idempotencyKey: string;
  emailType: string;
  recipient: string;
  customerId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  send: () => Promise<{ sent: boolean; error?: string; providerMessageId?: string }>;
}): Promise<{ sent: boolean; skipped: boolean; error?: string }> {
  const { error: claimError } = await admin.from('email_log').insert([{
    idempotency_key: idempotencyKey,
    email_type: emailType,
    recipient,
    customer_id: customerId || null,
    order_id: orderId || null,
    shipment_id: shipmentId || null,
    status: 'pending',
    attempt_count: 1,
  }]);

  if (claimError) {
    // 23505 = unique_violation — another call already claimed this
    // exact idempotency key, meaning this email either already sent
    // or is actively being sent right now. Either way, do not send
    // again. Any OTHER error (e.g. table missing, bad column) fails
    // safe by skipping the send entirely rather than risking an
    // unlogged duplicate.
    const alreadyClaimed = claimError.code === '23505';
    return { sent: false, skipped: true, error: alreadyClaimed ? undefined : `Could not claim idempotency key: ${claimError.message}` };
  }

  const result = await send();

  await admin.from('email_log').update({
    status: result.sent ? 'sent' : 'failed',
    provider_message_id: result.providerMessageId || null,
    last_error: result.error || null,
    sent_at: result.sent ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('idempotency_key', idempotencyKey);

  return { sent: result.sent, skipped: false, error: result.error };
}

export async function sendOrderConfirmationEmail({
  toEmail, toName, order, items,
}: {
  toEmail: string;
  toName?: string | null;
  order: { order_number: string; total: number; payment_method?: string | null; created_at: string };
  items: Array<{ name: string; price: number; qty: number }>;
}): Promise<{ sent: boolean; error?: string; providerMessageId?: string }> {
  // Email is a nice-to-have, never allowed to block or fail order
  // fulfillment — callers should treat a failure here as non-fatal.
  if (!RESEND_API_KEY) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">${escapeHtml(i.name)} × ${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${formatINR(i.price * i.qty)}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
    <h1 style="font-size:20px;letter-spacing:-0.02em;">RacquetIn</h1>
    <p style="font-size:15px;">Hi ${toName ? escapeHtml(toName) : 'there'},</p>
    <p style="font-size:15px;">Thanks for your order — here's your confirmation.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#666;">Order Number</td><td style="padding:6px 0;text-align:right;font-weight:600;">${escapeHtml(order.order_number)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Order Date</td><td style="padding:6px 0;text-align:right;">${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
      ${order.payment_method ? `<tr><td style="padding:6px 0;color:#666;">Payment Method</td><td style="padding:6px 0;text-align:right;text-transform:capitalize;">${escapeHtml(order.payment_method)}</td></tr>` : ''}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${itemRows}
      <tr><td style="padding:14px 0 0;font-weight:700;">Total Paid</td><td style="padding:14px 0 0;text-align:right;font-weight:700;">${formatINRFromPaise(order.total)}</td></tr>
    </table>
    <p style="font-size:13px;color:#666;margin-top:32px;">We'll send another email once your order ships. Questions? Just reply to this email.</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        reply_to: REPLY_TO_EMAIL,
        subject: `Order Confirmed — ${order.order_number}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Resend API error (${res.status}): ${body}` };
    }
    const body = await res.json().catch(() => null);
    return { sent: true, providerMessageId: body?.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// ── Email-verified welcome email ──────────────────────────────────
// Sent exactly once, server-side, the moment a user's email_confirmed_at
// transitions from null to a real timestamp — see
// supabase/migration_email_verification_webhook.sql for the trigger
// that calls the on-email-verified function, which calls this. Not
// triggered from the client, so it fires reliably even if the person
// closes the tab right after clicking the verification link.
export async function sendVerificationWelcomeEmail({
  toEmail, toName,
}: {
  toEmail: string;
  toName?: string | null;
}): Promise<{ sent: boolean; error?: string; providerMessageId?: string }> {
  if (!RESEND_API_KEY) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
    <h1 style="font-size:20px;letter-spacing:-0.02em;">RacquetIn</h1>
    <p style="font-size:15px;">Hi ${toName ? escapeHtml(toName) : 'there'},</p>
    <p style="font-size:15px;">Your email is verified and your account is ready to go.</p>
    <p style="font-size:15px;">Browse the collection, track orders, and manage your wishlist — all from your account.</p>
    <p style="font-size:13px;color:#666;margin-top:32px;">Questions? Just reply to this email.</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        reply_to: REPLY_TO_EMAIL,
        subject: 'Welcome to RacquetIn — you\'re verified',
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Resend API error (${res.status}): ${body}` };
    }
    const body = await res.json().catch(() => null);
    return { sent: true, providerMessageId: body?.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}
