// ── Shipments API ─────────────────────────────────────────────────
// Every screen (admin Order Detail panel, customer Account page) reads
// and writes through here — never directly against a courier's API.
// See src/lib/shipping/README.md for the provider interface this
// wraps, and why that separation is what lets a real courier get
// plugged in later without any UI changes.
import { supabase } from '../supabase';
import { getUser } from '../auth';
import { getProvider } from '../shipping';

const SHIPMENT_STATUSES = ['pending', 'packed', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned'];
export { SHIPMENT_STATUSES };

export async function fetchShipmentByOrderId(orderId) {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipment_events(*)')
    .eq('order_id', orderId)
    .order('occurred_at', { referencedTable: 'shipment_events', ascending: true })
    .maybeSingle();
  return { data, error };
}

// Customer-facing: shipment + timeline for the caller's OWN orders only
// (enforced by shipments_own_read / shipment_events_own_read RLS —
// this function doesn't need its own extra filtering on top of that).
export async function fetchMyShipments(orderIds) {
  const { user } = await getUser();
  if (!user || !orderIds?.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipment_events(*)')
    .in('order_id', orderIds);
  return { data: data || [], error };
}

// ── Admin actions ─────────────────────────────────────────────────

export async function createShipment(orderId, fields = {}) {
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();
  const provider = getProvider(fields.provider || 'manual');

  // A 'manual' placeholder shipment already exists for every order by
  // the time an admin looks at it — created automatically the moment
  // the order is fulfilled (see fulfillOrder.ts step 5, "Order
  // confirmed — preparing for dispatch"), so customers see something
  // on /account immediately. That means this function is really
  // "assign/switch the provider on the existing shipment" in practice,
  // not "create a new row" — blindly inserting here (as this used to
  // do) would silently create a second shipments row for the same
  // order, which nothing in the schema was preventing.
  const { data: existing } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle();

  let shipment, upsertError;
  if (existing) {
    ({ data: shipment, error: upsertError } = await supabase
      .from('shipments')
      .update({ provider: provider.slug })
      .eq('id', existing.id)
      .select().single());
  } else {
    ({ data: shipment, error: upsertError } = await supabase
      .from('shipments')
      .insert([{ order_id: orderId, provider: provider.slug, shipment_status: 'pending', ...fields }])
      .select().single());
  }
  if (upsertError) return { data: null, error: upsertError };

  // Let the provider normalize/fill in anything it owns (a no-op for
  // 'manual'; a real courier's createShipment would return tracking
  // info here instead).
  const result = await provider.createShipment(order, shipment);
  const { data: updated } = await supabase
    .from('shipments')
    .update({
      tracking_number: result.trackingNumber ?? shipment.tracking_number,
      tracking_url: result.trackingUrl ?? shipment.tracking_url,
      courier_name: result.courierName ?? shipment.courier_name,
      label_url: result.labelUrl ?? shipment.label_url,
      estimated_delivery: result.estimatedDelivery ?? shipment.estimated_delivery,
      // Provider's own order/shipment id (e.g. Shiprocket's internal
      // numeric order_id) — not the same as tracking_number (the AWB).
      // Needed later so cancelShipment() can tell the provider WHICH
      // of its orders to cancel.
      provider_order_id: result.providerOrderId ?? shipment.provider_order_id,
    })
    .eq('id', shipment.id)
    .select().single();

  await logShipmentEvent(shipment.id, 'pending', existing ? `Provider set to ${provider.name}.` : 'Shipment created.');
  return { data: updated || shipment, error: null };
}

export async function updateShipment(id, fields) {
  const { data, error } = await supabase
    .from('shipments')
    .update(fields)
    .eq('id', id)
    .select().single();
  return { data, error };
}

// Status change + matching timeline event in one call — this is what
// "Mark packed / Mark shipped / Mark delivered" in the admin UI calls.
export async function markShipmentStatus(id, status, { description, location } = {}) {
  if (!SHIPMENT_STATUSES.includes(status)) {
    return { data: null, error: { message: `Invalid status: ${status}` } };
  }
  const { data, error } = await supabase
    .from('shipments')
    .update({ shipment_status: status })
    .eq('id', id)
    .select().single();
  if (error) return { data: null, error };

  await logShipmentEvent(id, status, description || defaultStatusDescription(status), location);
  return { data, error: null };
}

export async function cancelShipment(id, reason) {
  // Previously this only ever updated our own shipment_status — fine
  // for 'manual' (nothing external to cancel), but for a real courier
  // it would silently leave the order live on their side while our own
  // records said "cancelled". Cancel with the provider FIRST; only
  // mark our own status once that's confirmed (or skip straight to it
  // for 'manual', which has nothing to do here).
  const { data: shipment, error: fetchError } = await supabase.from('shipments').select('*').eq('id', id).single();
  if (fetchError || !shipment) return { data: null, error: fetchError || { message: 'Shipment not found' } };

  if (shipment.provider && shipment.provider !== 'manual') {
    const provider = getProvider(shipment.provider);
    try {
      await provider.cancelShipment(shipment);
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Provider cancellation failed' } };
    }
  }

  return markShipmentStatus(id, 'cancelled', { description: reason || 'Shipment cancelled.' });
}

export async function logShipmentEvent(shipmentId, eventType, description, location) {
  const { data, error } = await supabase
    .from('shipment_events')
    .insert([{ shipment_id: shipmentId, event_type: eventType, description, location }])
    .select().single();
  return { data, error };
}

function defaultStatusDescription(status) {
  return {
    pending: 'Order confirmed — preparing for dispatch.',
    packed: 'Your order has been packed.',
    shipped: 'Your order has been handed to the courier.',
    in_transit: 'Your order is on its way.',
    delivered: 'Your order has been delivered.',
    cancelled: 'Shipment cancelled.',
    returned: 'Shipment returned.',
  }[status] || '';
}

export async function fetchDeliveryProviders() {
  const { data, error } = await supabase.from('delivery_providers').select('*').order('name');
  return { data: data || [], error };
}
