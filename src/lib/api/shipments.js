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
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const provider = getProvider(fields.provider || 'manual');

  const { data: shipment, error } = await supabase
    .from('shipments')
    .insert([{ order_id: orderId, provider: provider.slug, shipment_status: 'pending', ...fields }])
    .select().single();
  if (error) return { data: null, error };

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
    })
    .eq('id', shipment.id)
    .select().single();

  await logShipmentEvent(shipment.id, 'pending', 'Shipment created.');
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
