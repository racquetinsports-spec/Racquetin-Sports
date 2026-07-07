# Delivery provider interface

This is the contract every delivery provider implements. Today only
`manualProvider.js` exists — the admin enters tracking info by hand.
When a real courier account is ready (Shiprocket, Delhivery, NimbusPost,
or anything else), add a new file here implementing the same shape and
register it in `index.js`. **No admin UI, no customer UI, and no
database schema changes are needed for that step** — every screen reads
and writes through `src/lib/api/shipments.js`, which only ever talks to
this interface, never to a specific courier's API directly.

## The interface

```ts
{
  slug: string,        // matches a row in the delivery_providers table, e.g. 'shiprocket'
  name: string,         // display name, e.g. 'Shiprocket'

  // Called when an order is ready to hand off to the courier. Returns
  // whatever the provider needs persisted onto the shipments row —
  // tracking_number, tracking_url, courier_name, label_url, etc.
  async createShipment(order, shipment) => Promise<{
    trackingNumber?: string,
    trackingUrl?: string,
    courierName?: string,
    labelUrl?: string,
    estimatedDelivery?: string, // ISO date
    raw?: object,               // provider's raw response, for debugging
  }>,

  // Called to refresh tracking status from the courier's side (e.g. via
  // polling or the provider's own webhook). Returns a normalized status
  // matching shipments.shipment_status, plus any new timeline events.
  async getTracking(shipment) => Promise<{
    status: 'pending' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'returned',
    events: Array<{ eventType: string, description?: string, location?: string, occurredAt: string }>,
  }>,

  // Called when an order/shipment is cancelled before dispatch.
  async cancelShipment(shipment) => Promise<{ cancelled: boolean }>,
}
```

## Adding a real provider later

1. Create `shiprocketProvider.js` (or similar) implementing the shape above.
   Any API keys/secrets it needs belong in a Supabase Edge Function
   (never in frontend code or `VITE_`-prefixed env vars) — the same
   pattern already used for Razorpay in `supabase/functions/`.
2. Insert a row into `delivery_providers` for it (slug, name, config).
3. Register it in `index.js`'s `PROVIDERS` map.
4. Nothing else changes — `src/lib/api/shipments.js`, the admin Order
   Detail shipment panel, and the customer Account page all already
   read/write generically and don't know or care which provider is active.
