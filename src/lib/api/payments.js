// ── Razorpay Payment Integration ─────────────────────────────────
// All sensitive work (pricing, order creation, signature verification)
// happens in Supabase Edge Functions — see supabase/functions/. The
// frontend only ever: asks the server to create a Razorpay order,
// opens Razorpay Checkout with the id it gets back, and asks the
// server to verify the result. It never computes a price that's
// trusted, never creates an order row, and never sees
// RAZORPAY_KEY_SECRET.
import { supabase } from '../supabase';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Load the Razorpay checkout script dynamically (not at bundle time)
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Step 1: ask the server to price the cart and create a Razorpay order ──
// items: [{ productId, qty, variant }] — price is NOT sent; the server
// re-looks-up every product's current price and ignores anything else.
export async function createRazorpayOrder({ items, shippingAddress, billingAddress, couponCode }) {
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { items, shippingAddress, billingAddress, couponCode },
  });
  if (error) return { data: null, error: { message: error.message || 'Could not start checkout' } };
  if (data?.error) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

// ── Step 2: after Razorpay's checkout modal succeeds, ask the server
// to verify the signature and (only then) create the real order ──
export async function verifyRazorpayPayment({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: { razorpay_payment_id, razorpay_order_id, razorpay_signature },
  });
  if (error) return { data: null, error: { message: error.message || 'Payment verification failed' } };
  if (data?.error) return { data: null, error: { message: data.error } };
  return { data, error: null };
}

// ── Open the Razorpay Checkout modal ──────────────────────────────
// amount/orderId here always come from createRazorpayOrder() above —
// never computed client-side.
export async function initiatePayment({ amount, currency = 'INR', orderId, customerName, customerEmail, customerPhone, description, onSuccess, onFailure }) {
  if (!RAZORPAY_KEY_ID) {
    console.warn('[RacquetIn] VITE_RAZORPAY_KEY_ID not set. Payment will not work.');
    onFailure?.({ error: { description: 'Payment gateway not configured' } });
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onFailure?.({ error: { description: 'Failed to load payment gateway' } });
    return;
  }

  const options = {
    key:          RAZORPAY_KEY_ID,
    amount,                    // paise
    currency,
    name:         'RacquetIn',
    description:  description || 'Premium Badminton Equipment',
    order_id:     orderId,     // Razorpay Order ID from the server
    prefill: {
      name:  customerName,
      email: customerEmail,
      contact: customerPhone,
    },
    theme: { color: '#002B6B' },
    modal: {
      ondismiss: () => onFailure?.({ error: { description: 'Payment cancelled' } }),
    },
    handler: (response) => {
      // response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature
      // These are NOT trusted as-is — onSuccess must call
      // verifyRazorpayPayment() before treating the order as placed.
      onSuccess?.(response);
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', onFailure);
  rzp.open();
}
