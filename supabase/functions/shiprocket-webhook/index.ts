// ── Shiprocket webhook ────────────────────────────────────────────
// Receives Shiprocket's push notifications for tracking updates —
// set this function's URL in Shiprocket's dashboard under
// Settings → API → Webhooks, with the same value as
// SHIPROCKET_WEBHOOK_SECRET set below as the "security token" (sent
// back to us as an x-api-key header on every call, per Shiprocket's
// own webhook docs).
//
// This is what keeps shipment_status current automatically once an
// order ships — without it, tracking would only ever update when an
// admin manually clicks "Mark Shipped"/"Mark Delivered" in the
// dashboard, same as the 'manual' provider.
import { jsonResponse } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabaseClients.ts';

const SHIPROCKET_WEBHOOK_SECRET = Deno.env.get('SHIPROCKET_WEBHOOK_SECRET');

// Best-effort mapping from Shiprocket's status vocabulary to this
// app's shipment_status enum (pending | packed | shipped | in_transit
// | delivered | cancelled | returned). Shiprocket's own status list is
// larger and not exhaustively documented here — an unmapped status is
// deliberately left alone (event still logged, shipment_status
// untouched) rather than guessed at.
const STATUS_MAP: Record<string, string> = {
  'NEW': 'pending',
  'MANIFEST GENERATED': 'packed',
  'PICKED UP': 'shipped',
  'SHIPPED': 'shipped',
  'IN TRANSIT': 'in_transit',
  'OUT FOR DELIVERY': 'in_transit',
  'DELIVERED': 'delivered',
  'CANCELLED': 'cancelled',
  'CANCELED': 'cancelled',
  'RTO INITIATED': 'returned',
  'RTO DELIVERED': 'returned',
  'RETURNED': 'returned',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    if (SHIPROCKET_WEBHOOK_SECRET && req.headers.get('x-api-key') !== SHIPROCKET_WEBHOOK_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const awb = body?.awb;
    const currentStatus = (body?.current_status || body?.shipment_status || '').toUpperCase();
    if (!awb) return jsonResponse({ skipped: true, reason: 'No awb in payload' });

    const admin = getAdminClient();
    const { data: shipment } = await admin
      .from('shipments')
      .select('*')
      .eq('tracking_number', awb)
      .maybeSingle();

    if (!shipment) {
      // Not necessarily an error — could be a webhook for an order
      // this project didn't create (unlikely but not impossible on a
      // shared Shiprocket account). Acknowledge so Shiprocket doesn't
      // keep retrying, but don't pretend anything was updated.
      return jsonResponse({ skipped: true, reason: 'No shipment found for this awb' });
    }

    const mappedStatus = STATUS_MAP[currentStatus];
    if (mappedStatus && mappedStatus !== shipment.shipment_status) {
      await admin.from('shipments').update({ shipment_status: mappedStatus }).eq('id', shipment.id);
    }

    // Avoid spamming an identical consecutive event on repeated
    // webhook calls for the same status (Shiprocket can call this
    // more than once per real status change).
    const { data: lastEvent } = await admin
      .from('shipment_events')
      .select('event_type, description')
      .eq('shipment_id', shipment.id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const eventType = mappedStatus || 'note';
    const description = body?.current_status || body?.shipment_status || 'Tracking update';
    if (!lastEvent || lastEvent.event_type !== eventType || lastEvent.description !== description) {
      await admin.from('shipment_events').insert([{
        shipment_id: shipment.id,
        event_type: eventType,
        description,
        location: body?.scans?.[body.scans.length - 1]?.location || null,
      }]);
    }

    return jsonResponse({ success: true, mappedStatus: mappedStatus || null });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
