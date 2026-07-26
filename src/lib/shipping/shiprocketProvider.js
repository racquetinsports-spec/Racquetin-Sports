// ── Shiprocket provider ──────────────────────────────────────────
// Implements the interface documented in README.md. Unlike
// manualProvider, this one has real external API work to do — but it
// never calls Shiprocket's API directly from the browser (that would
// mean shipping the account's real credentials to every visitor).
// Every call here goes through the shiprocket-shipment Edge Function
// instead, which is the only place that actually holds the Shiprocket
// email/password/pickup-location secrets. See that function's header
// comment for exactly which secrets need to be set before this works.
import { supabase } from '../supabase';

async function invoke(action, body) {
  const { data, error } = await supabase.functions.invoke('shiprocket-shipment', {
    body: { action, ...body },
  });
  if (error) {
    // Mirrors the same extraction pattern used for the Razorpay Edge
    // Functions — error.context carries the actual JSON error body on
    // a non-2xx response; error.message is the fallback when the
    // request couldn't even reach the function.
    let message = error.message || 'Shiprocket request failed';
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // Response wasn't JSON — keep the fallback message above.
    }
    throw new Error(message);
  }
  return data;
}

export const shiprocketProvider = {
  slug: 'shiprocket',
  name: 'Shiprocket',

  async createShipment(order, shipment) {
    const result = await invoke('create', { order, shipment });
    return {
      trackingNumber: result.trackingNumber || undefined,
      trackingUrl: result.trackingUrl || undefined,
      courierName: result.courierName || undefined,
      labelUrl: undefined, // not fetched at creation time — see README note in the Edge Function about generate-label as a follow-up action
      estimatedDelivery: undefined,
      providerOrderId: result.shiprocketOrderId != null ? String(result.shiprocketOrderId) : undefined,
      // Order creation can succeed while courier auto-assignment still
      // fails (see the Edge Function's autoAssignCourier) — that's not
      // a thrown error (the shipment IS real, just without a courier
      // yet), so it's surfaced as a warning instead, for the admin UI
      // to display rather than silently dropping.
      warning: result.courierAssignError || undefined,
      raw: result,
    };
  },

  // Tracking updates arrive via Shiprocket's own push webhook (see
  // supabase/functions/shiprocket-webhook), not by polling — this
  // exists to satisfy the shared provider interface, but isn't
  // currently called anywhere in the app.
  async getTracking(shipment) {
    return { status: shipment.shipment_status, events: [] };
  },

  async cancelShipment(shipment) {
    if (!shipment.provider_order_id) {
      throw new Error('No Shiprocket order id on this shipment — cancel it directly from the Shiprocket dashboard instead.');
    }
    const result = await invoke('cancel', { shipment: { provider_order_id: shipment.provider_order_id } });
    return { cancelled: !!result.cancelled };
  },
};
