-- ═══════════════════════════════════════════════════════════════════
-- Migration: Shiprocket integration
-- ═══════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Safe to re-run — every
-- statement below is idempotent (IF NOT EXISTS / ON CONFLICT).

-- The provider's own order/shipment id (Shiprocket's internal numeric
-- order_id) — distinct from tracking_number (the AWB). Needed so
-- cancelShipment() can tell Shiprocket which of its orders to cancel;
-- without this column, cancellation only ever updated our own
-- shipment_status and never reached Shiprocket at all.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS provider_order_id TEXT;

INSERT INTO delivery_providers (slug, name, is_active, config) VALUES
  ('shiprocket', 'Shiprocket', true, '{}')
ON CONFLICT (slug) DO NOTHING;
