// ── Shared order fulfillment ──────────────────────────────────────
// Called after a payment is confirmed captured (either via the
// client-driven verify-razorpay-payment call, or via the
// razorpay-webhook as a safety net if the client never completes
// that call — e.g. the customer closed the tab right after paying).
// Idempotent: if the intent has already been consumed, this is a
// no-op that returns the existing order instead of creating a
// duplicate — Razorpay webhooks and client verification can both
// arrive for the same payment, sometimes more than once.
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { sendOrderConfirmationEmail } from './email.ts';

export async function fulfillOrderFromIntent({
  admin, providerOrderId, providerPaymentId, paymentMethod, rawPayment,
}: {
  admin: SupabaseClient;
  providerOrderId: string;
  providerPaymentId: string;
  paymentMethod?: string | null;
  rawPayment: unknown;
}): Promise<{ order: any; alreadyFulfilled: boolean; error: string | null; emailSent?: boolean; emailError?: string | null }> {
  const { data: intent, error: intentError } = await admin
    .from('payment_intents')
    .select('*')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();

  if (intentError) return { order: null, alreadyFulfilled: false, error: intentError.message };
  if (!intent) return { order: null, alreadyFulfilled: false, error: 'No matching payment intent for this order id' };

  // Already fulfilled — return the existing order instead of creating a duplicate.
  if (intent.status === 'consumed') {
    const { data: existingPayment } = await admin
      .from('payments')
      .select('order_id')
      .eq('provider_order_id', providerOrderId)
      .maybeSingle();
    if (existingPayment?.order_id) {
      const { data: existingOrder } = await admin.from('orders').select('*').eq('id', existingPayment.order_id).single();
      return { order: existingOrder, alreadyFulfilled: true, error: null };
    }
    return { order: null, alreadyFulfilled: true, error: null };
  }

  // 1. Create the real order from the server-computed intent snapshot —
  //    never from anything the client sends at this step.
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert([{
      user_id: intent.user_id,
      status: 'pending',
      payment_status: 'paid',
      payment_id: providerPaymentId,
      razorpay_order_id: providerOrderId,
      payment_verified: true,
      payment_method: paymentMethod || null,
      subtotal: intent.subtotal,
      tax: intent.tax,
      shipping_cost: intent.shipping_cost,
      discount: intent.discount,
      total: intent.total,
      shipping_address: intent.shipping_address,
      billing_address: intent.billing_address || intent.shipping_address,
      coupon_code: intent.coupon_code,
    }])
    .select().single();

  if (orderError) return { order: null, alreadyFulfilled: false, error: orderError.message };

  // 2. Order items, from the same snapshot.
  const items = intent.items as Array<{ product_id: string | null; name: string; price: number; qty: number; variant?: object; variant_id?: string | null; image_url?: string | null }>;
  const orderItems = items.map(i => ({
    order_id: order.id,
    product_id: i.product_id,
    name: i.name,
    price: i.price,
    qty: i.qty,
    variant: i.variant || {},
    variant_id: i.variant_id || null,
    image_url: i.image_url || null,
  }));
  const { error: itemsError } = await admin.from('order_items').insert(orderItems);
  if (itemsError) return { order, alreadyFulfilled: false, error: itemsError.message };

  // 3. Inventory — decremented only now, never before verified payment.
  // A line with a variant_id (e.g. a specific shoe size) deducts from
  // that variant's own tracked stock, not the parent product's — the
  // whole reason product_variants exists rather than a single stock
  // number per product.
  for (const item of items) {
    if (item.variant_id) {
      await admin.rpc('decrement_variant_stock', { variant_id: item.variant_id, qty: item.qty });
    } else if (item.product_id) {
      await admin.rpc('decrement_stock', { product_id: item.product_id, qty: item.qty });
    }
  }

  // 4. Payment record.
  const { error: paymentError } = await admin
    .from('payments')
    .insert([{
      order_id: order.id,
      customer_id: intent.user_id,
      provider: 'razorpay',
      provider_order_id: providerOrderId,
      provider_payment_id: providerPaymentId,
      amount: intent.total,
      currency: 'INR',
      status: 'paid',
      signature_verified: true,
      payment_method: paymentMethod || null,
      captured_at: new Date().toISOString(),
      raw_response: rawPayment,
    }]);
  if (paymentError) return { order, alreadyFulfilled: false, error: paymentError.message };

  // 5. Shipment placeholder + its first timeline event.
  const { data: shipment } = await admin
    .from('shipments')
    .insert([{ order_id: order.id, provider: 'manual', shipment_status: 'pending' }])
    .select().single();
  if (shipment) {
    await admin.from('shipment_events').insert([{
      shipment_id: shipment.id,
      event_type: 'pending',
      description: 'Order confirmed — preparing for dispatch.',
    }]);
  }

  // 6. Clear the cart server-side (the client also clears its own local
  //    state on success, but doing it here too means the cart is empty
  //    even if the client never gets to run that code).
  await admin.from('cart_items').delete().eq('user_id', intent.user_id);

  // 7. Mark the intent consumed so a duplicate webhook/verify call is a no-op.
  await admin.from('payment_intents').update({ status: 'consumed', consumed_at: new Date().toISOString() }).eq('id', intent.id);

  // 8. Order confirmation email — best-effort only. A failed send here
  // must never undo or fail the order itself; the order has already
  // been created, paid, and inventory adjusted by this point. It IS,
  // however, logged and returned to the caller — a previous version of
  // this swallowed every failure completely silently (no log, no
  // return value), which made "customer says they never got an email"
  // impossible to diagnose from the Edge Function logs alone.
  let emailSent = false;
  let emailError: string | null = null;
  try {
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('email, full_name')
      .eq('user_id', intent.user_id)
      .maybeSingle();

    if (customerError) {
      emailError = `Could not look up customer: ${customerError.message}`;
    } else if (!customer?.email) {
      emailError = `No customers row (or no email on it) for user_id ${intent.user_id}`;
    } else {
      const result = await sendOrderConfirmationEmail({
        toEmail: customer.email,
        toName: customer.full_name,
        order: { order_number: order.order_number, total: order.total, payment_method: paymentMethod, created_at: order.created_at },
        items: items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
      });
      emailSent = result.sent;
      emailError = result.error || null;
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : 'Unknown error sending order confirmation email';
  }

  if (!emailSent) {
    console.error(`[fulfillOrder] order confirmation email NOT sent for order ${order.order_number}: ${emailError}`);
  } else {
    console.log(`[fulfillOrder] order confirmation email sent for order ${order.order_number}`);
  }

  return { order, alreadyFulfilled: false, error: null, emailSent, emailError };
}
