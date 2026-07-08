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

// TAX_RATE/FREE_SHIPPING_THRESHOLD/SHIPPING_COST are documented (and
// read from .env.example) as paise, matching Razorpay's own convention —
// but products.price is plain rupees, so they're converted to rupees once
// here, right alongside where that assumption is defined, rather than
// mixing units throughout the calculation below.
const TAX_RATE = parseFloat(Deno.env.get('TAX_RATE') || '0.18');
const FREE_SHIPPING_THRESHOLD_RUPEES = parseInt(Deno.env.get('FREE_SHIPPING_THRESHOLD') || '500000', 10) / 100;
const STANDARD_SHIPPING_RUPEES = parseInt(Deno.env.get('SHIPPING_COST') || '8900', 10) / 100;
// Matches the amounts already shown on the checkout page's delivery
// method options — previously decorative only, since shipping cost never
// actually varied by which one was selected.
const EXPRESS_SHIPPING_RUPEES = 799;
const NEXT_DAY_SHIPPING_RUPEES = 1299;
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

      // Look up by slug — every cart item's productId from the frontend
      // is a slug, never a raw UUID (see the app-wide convention in
      // src/utils/normalizeProduct.js). `id` is a UUID column, so a
      // combined `.or('id.eq.X,slug.eq.X')` filter here would throw a
      // Postgres "invalid input syntax for type uuid" error the instant
      // X isn't UUID-shaped — which is always, since slugs never are.
      // This is the exact same bug that was fixed in fetchProductById()
      // on the frontend; fixed the same way here: query by slug alone,
      // and only attempt an id-based lookup if the string actually
      // looks like a UUID.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      let product = null, productError = null;
      const selectClause = 'id, slug, name, price, stock, is_active, product_images(url, is_primary, sort_order)';

      const bySlug = await admin.from('products').select(selectClause).eq('slug', slugOrId).maybeSingle();
      if (bySlug.error) productError = bySlug.error;
      else if (bySlug.data) product = bySlug.data;
      else if (isUuid) {
        const byId = await admin.from('products').select(selectClause).eq('id', slugOrId).maybeSingle();
        if (byId.error) productError = byId.error;
        else product = byId.data;
      }

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

    const subtotalRupees = pricedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const taxRupees = Math.round(subtotalRupees * TAX_RATE);

    // Shipping now actually reflects which delivery method was selected —
    // previously this only ever checked the free-shipping threshold and
    // ignored the choice entirely, so Express/Next Day never cost anything
    // extra despite what the checkout UI displayed.
    const deliveryMethod = shippingAddress?.delivery || 'std';
    let shippingCostRupees;
    if (deliveryMethod === 'exp') shippingCostRupees = EXPRESS_SHIPPING_RUPEES;
    else if (deliveryMethod === 'nxt') shippingCostRupees = NEXT_DAY_SHIPPING_RUPEES;
    else shippingCostRupees = subtotalRupees >= FREE_SHIPPING_THRESHOLD_RUPEES ? 0 : STANDARD_SHIPPING_RUPEES;

    const discountRupees = 0; // coupon logic can compute a real value here later; structure is already in place
    const totalRupees = subtotalRupees + taxRupees + shippingCostRupees - discountRupees;

    // products.price (and therefore every figure above) is stored in plain
    // rupees — matching the convention used everywhere else in this app
    // (cart, product pages, admin product list). But orders.total,
    // orders.subtotal/tax/shipping_cost, and payments.amount are all read
    // elsewhere (admin Orders page, order confirmation page, account page)
    // by dividing by 100 — i.e. those columns are meant to hold paise, the
    // same unit Razorpay's own API requires. This was the actual bug: this
    // function was computing everything in rupees and hoping downstream
    // dividers treated it as paise, so a real order total of ₹39,578 was
    // charged as ₹395.78 (39578 paise). Converting once, right here, to
    // paise for every aggregate figure — but NOT for the per-item `price`
    // above, which order_items.price already displays without dividing —
    // fixes it at the one place all three (Razorpay, DB storage, and
    // display) actually agree on.
    const subtotal = Math.round(subtotalRupees * 100);
    const tax = Math.round(taxRupees * 100);
    const shippingCost = Math.round(shippingCostRupees * 100);
    const discount = Math.round(discountRupees * 100);
    const total = Math.round(totalRupees * 100);

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
