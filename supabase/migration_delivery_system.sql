-- ═══════════════════════════════════════════════════════════════════
-- Migration: Provider-agnostic delivery system
-- ═══════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL editor. Safe to re-run — column
-- renames/adds use IF EXISTS/IF NOT EXISTS guards.
--
-- Design: `shipments` holds the current state of one order's delivery.
-- `shipment_events` is an append-only timeline (status changes, manual
-- notes) shown to the customer on /account. `delivery_providers` is a
-- registry of which courier integrations exist — today it only has a
-- 'manual' row (the admin enters tracking info by hand), but a real
-- ShiprocketProvider/DelhiveryProvider/NimbusPostProvider can be added
-- later purely as new rows + a new src/lib/shipping/*.js file
-- implementing the same interface (see src/lib/shipping/README.md) —
-- no schema change and no UI change required for that later step.
-- ═══════════════════════════════════════════════════════════════════

-- ── Extend shipments ───────────────────────────────────────────────
-- Renamed for clarity/consistency with the rest of this migration:
-- "status" → "shipment_status" (distinct from orders.status, which is
-- the order's own fulfillment stage), "carrier" → "courier_name".
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'status') THEN
    ALTER TABLE shipments RENAME COLUMN status TO shipment_status;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'carrier') THEN
    ALTER TABLE shipments RENAME COLUMN carrier TO courier_name;
  END IF;
END $$;

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual';
-- 'manual' today; 'shiprocket' | 'delhivery' | 'nimbuspost' | etc. once a real provider is plugged in.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS label_url TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN shipments.shipment_status IS 'pending | packed | shipped | in_transit | delivered | cancelled | returned';

-- ── shipment_events (customer-facing timeline + audit trail) ───────
CREATE TABLE IF NOT EXISTS shipment_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- pending | packed | shipped | in_transit | delivered | cancelled | returned | note
  description  TEXT,
  location     TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_occurred ON shipment_events(occurred_at);

-- ── delivery_providers (pluggable provider registry) ───────────────
CREATE TABLE IF NOT EXISTS delivery_providers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT UNIQUE NOT NULL, -- 'manual' | 'shiprocket' | 'delhivery' | 'nimbuspost' ...
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  config     JSONB DEFAULT '{}', -- provider-specific settings (API base URL, account id, etc.) — never API keys/secrets, those stay as Edge Function secrets when a real provider is added
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO delivery_providers (slug, name, is_active, config) VALUES
  ('manual', 'Manual (entered by admin)', true, '{}')
ON CONFLICT (slug) DO NOTHING;

DROP TRIGGER IF EXISTS delivery_providers_updated ON delivery_providers;
CREATE TRIGGER delivery_providers_updated BEFORE UPDATE ON delivery_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE shipment_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_providers ENABLE ROW LEVEL SECURITY;

-- A customer can read the event timeline for their own orders'
-- shipments (mirrors the existing shipments_own_read policy).
DROP POLICY IF EXISTS "shipment_events_own_read" ON shipment_events;
DROP POLICY IF EXISTS "shipment_events_admin_all" ON shipment_events;
CREATE POLICY "shipment_events_own_read" ON shipment_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shipments
    JOIN orders ON orders.id = shipments.order_id
    WHERE shipments.id = shipment_events.shipment_id AND orders.user_id = auth.uid()
  )
);
CREATE POLICY "shipment_events_admin_all" ON shipment_events FOR ALL USING (is_admin_user());

-- delivery_providers is internal configuration — admin only, never
-- customer-facing (a customer doesn't need to know which courier API
-- is wired up, only their own shipment's tracking info).
DROP POLICY IF EXISTS "delivery_providers_admin_all" ON delivery_providers;
CREATE POLICY "delivery_providers_admin_all" ON delivery_providers FOR ALL USING (is_admin_user());

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
