// ── Manual provider ────────────────────────────────────────────────
// Implements the interface documented in README.md without calling any
// external API — the admin enters courier/tracking details by hand via
// the Order Detail shipment panel. This is what makes the delivery
// system usable today even though no courier account has been chosen
// yet: every other part of the app already talks to "a provider"
// through this same shape, so swapping this out for a real courier
// later doesn't require changing the UI.
export const manualProvider = {
  slug: 'manual',
  name: 'Manual (entered by admin)',

  // There's nothing to call — the admin's own form submission *is* the
  // "creation" of the shipment record. This exists so the interface is
  // uniform even for the manual case.
  async createShipment(_order, shipment) {
    return {
      trackingNumber: shipment.tracking_number || undefined,
      trackingUrl: shipment.tracking_url || undefined,
      courierName: shipment.courier_name || undefined,
      labelUrl: shipment.label_url || undefined,
      estimatedDelivery: shipment.estimated_delivery || undefined,
      raw: null,
    };
  },

  // No external status to poll — the admin's manual status updates
  // (via markShipmentStatus in lib/api/shipments.js) are the source of
  // truth, each one already writing its own shipment_events row.
  async getTracking(shipment) {
    return { status: shipment.shipment_status, events: [] };
  },

  async cancelShipment() {
    return { cancelled: true };
  },
};
