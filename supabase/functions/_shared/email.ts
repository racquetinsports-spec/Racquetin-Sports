// ── Order confirmation email (Resend) ─────────────────────────────
// Sends from Resend's own verified default sender (onboarding@resend.dev)
// with Reply-To set to your real support inbox — a third-party service
// can never send authenticated mail claiming to be @gmail.com (SPF/DKIM/
// DMARC would reject it), so this is the correct approach until a real
// domain is verified with Resend, at which point only FROM_EMAIL below
// needs to change.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('ORDER_EMAIL_FROM') || 'RacquetIn <onboarding@resend.dev>';
const REPLY_TO_EMAIL = Deno.env.get('ORDER_EMAIL_REPLY_TO') || 'racquetinsports@gmail.com';

function formatRupees(paise: number): string {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

export async function sendOrderConfirmationEmail({
  toEmail, toName, order, items,
}: {
  toEmail: string;
  toName?: string | null;
  order: { order_number: string; total: number; payment_method?: string | null; created_at: string };
  items: Array<{ name: string; price: number; qty: number }>;
}): Promise<{ sent: boolean; error?: string }> {
  // Email is a nice-to-have, never allowed to block or fail order
  // fulfillment — callers should treat a failure here as non-fatal.
  if (!RESEND_API_KEY) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">${escapeHtml(i.name)} × ${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${formatRupees(i.price * i.qty)}</td>
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
      <tr><td style="padding:14px 0 0;font-weight:700;">Total Paid</td><td style="padding:14px 0 0;text-align:right;font-weight:700;">${formatRupees(order.total)}</td></tr>
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
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
