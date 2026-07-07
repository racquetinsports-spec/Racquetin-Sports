// ── create-razorpay-order ─────────────────────────────────────────
// POST body: { items: [{ productId, qty, variant? }], shippingAddress, billingAddress?, couponCode? }
// Requires: Authorization: Bearer <user's Supabase access token>
//
// Never trusts a price, subtotal, tax, or shipping figure from the
// client — every item's price is re-looked-up from the `products`
// table, and totals are recomputed here from scratch. Returns a real
// Razorpay order id which the frontend must use to open Razorpay
// Checkout; nothing is written to `orders` yet (see payment_intents).
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getRequestUser } from '../_shared/supabaseClients.ts';
import { createRazorpayOrder } from '../_shared/razorpay.ts';

const TAX_RATE = parseFloat(Deno.env.get('TAX_RATE') || '0.18');
const FREE_SHIPPING_THRESHOLD = parseInt(Deno.env.get('FREE_SHIPPING_THRESHOLD') || '500000', 10); // paise
const SHIPPING_COST = parseInt(Deno.env.get('SHIPPING_COST') || '8900', 10); // paise
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { user, error: authError } = await getRequestUser(req);
    if (!user) return jsonResponse({ error: authError || 'Not authenticated' }, 401);

    const body = await req.json();
    const { items, shippingAddress, billingAddress, couponCode } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'No items provided' }, 400);
    }
    if (!shippingAddress || !shippingAddress.address1 || !shippingAddress.city) {
      return jsonResponse({ error: 'A valid shipping address is required' }, 400);
    }

    const admin = getAdminClient();

    // Re-price every line item from the database — the client's price,
    // if it sent one at all, is ignored completely.
    const pricedItems = [];
    for (const raw of items) {
      const slugOrId = raw.productId;
      const qty = Math.max(1, parseInt(raw.qty, 10) || 1);
      if (!slugOrId) return jsonResponse({ error: 'Each item needs a productId' }, 400);

      const { data: product, error: productError } = await admin
        .from('products')
        .select('id, slug, name, price, stock, is_active, product_images(url, is_primary, sort_order)')
        .or(`id.eq.${slugOrId},slug.eq.${slugOrId}`)
        .maybeSingle();

      if (productError || !product) {
        return jsonResponse({ error: `Product not found: ${slugOrId}` }, 400);
      }
      if (!product.is_active) {
        return jsonResponse({ error: `"${product.name}" is no longer available` }, 400);
      }
      if (product.stock < qty) {
        return jsonResponse({ error: `Only ${product.stock} of "${product.name}" left in stock` }, 400);
      }

      const primaryImage = (product.product_images || [])
        .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))[0]?.url || null;

      pricedItems.push({
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,       // server price, not the client's
        qty,
        variant: raw.variant || {},
        image_url: primaryImage,
      });
    }

    const subtotal = pricedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const discount = 0; // coupon logic can compute a real value here later; structure is already in place
    const total = subtotal + tax + shippingCost - discount;

    if (total <= 0) return jsonResponse({ error: 'Order total must be greater than zero' }, 400);

    // Razorpay order amount/currency are what the customer will actually
    // be charged — this is the number that matters, computed above.
    const receipt = `ri_${Date.now()}_${user.id.slice(0, 8)}`;
    const razorpayOrder = await createRazorpayOrder({
      amount: total,
      currency: 'INR',
      receipt,
      notes: { user_id: user.id },
    });

    const { error: intentError } = await admin.from('payment_intents').insert([{
      user_id: user.id,
      provider: 'razorpay',
      provider_order_id: razorpayOrder.id,
      items: pricedItems,
      shipping_address: shippingAddress,
      billing_address: billingAddress || shippingAddress,
      coupon_code: couponCode || null,
      subtotal, tax, shipping_cost: shippingCost, discount, total,
      status: 'created',
    }]);

    if (intentError) return jsonResponse({ error: intentError.message }, 500);

    return jsonResponse({
      order_id: razorpayOrder.id,
      amount: total,
      currency: 'INR',
      key_id: RAZORPAY_KEY_ID, // public key, safe to return to the client
    });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
