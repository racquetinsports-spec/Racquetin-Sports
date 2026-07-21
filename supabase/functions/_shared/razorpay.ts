// ── Razorpay API + signature helpers ─────────────────────────────
export const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function basicAuthHeader(): string {
  return 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
}

export async function createRazorpayOrder({ amount, currency, receipt, notes }: {
  amount: number; currency: string; receipt: string; notes?: Record<string, string>;
}) {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, currency, receipt, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || 'Razorpay order creation failed');
  return data; // { id, amount, currency, receipt, status, ... }
}

export async function fetchRazorpayPayment(paymentId: string) {
  const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
    headers: { Authorization: basicAuthHeader() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || 'Could not fetch payment from Razorpay');
  return data;
}

// HMAC-SHA256(order_id + "|" + payment_id, key_secret) === signature
// This is Razorpay's documented client-side checkout verification —
// it MUST only ever run server-side (this file), never in the browser.
export async function verifyCheckoutSignature({
  orderId, paymentId, signature,
}: { orderId: string; paymentId: string; signature: string }): Promise<boolean> {
  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, RAZORPAY_KEY_SECRET);
  return timingSafeEqual(expected, signature);
}

// Webhook signature: HMAC-SHA256(raw request body, webhook secret)
export async function verifyWebhookSignature({
  rawBody, signature, secret,
}: { rawBody: string; signature: string; secret: string }): Promise<boolean> {
  const expected = await hmacSha256Hex(rawBody, secret);
  return timingSafeEqual(expected, signature);
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
