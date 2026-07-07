-- ═══════════════════════════════════════════════════════════════════
-- Migration: Production Razorpay payment architecture
-- ═══════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL editor against your existing
-- project. Additive only — nothing existing is dropped or altered
-- destructively. Safe to re-run (every statement is idempotent).
--
-- This migration exists to support a server-verified payment flow:
-- the frontend NEVER creates orders or payment records directly —
-- only the three Edge Functions (create-razorpay-order,
-- verify-razorpay-payment, razorpay-webhook), running with the
-- service role key, are allowed to write to these tables. RLS below
-- grants the client read-only access to its own data and nothing
-- else; there are deliberately no client-facing INSERT/UPDATE
-- policies on payments, payment_events, or payment_intents.
-- ═══════════════════════════════════════════════════════════════════

-- ── payment_intents ────────────────────────────────────────────────
-- Why this table exists: Razorpay order creation and payment
-- verification are two separate round trips (the customer pays in
-- between). The frontend must never be trusted to re-submit the cart
-- contents/prices at verification time — so create-razorpay-order
-- snapshots the *server-computed* items/prices/totals here, keyed by
-- the Razorpay order id, and verify-razorpay-payment / the webhook
-- read this snapshot back rather than trusting anything the client
-- sends at that step. This is what makes "never trust the frontend"
-- actually true end-to-end, not just at the first step.
CREATE TABLE IF NOT EXISTS payment_intents (
  id                UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT  NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT  UNIQUE NOT NULL,

  items             JSONB NOT NULL,   -- server-priced snapshot: [{product_id, slug, name, price, qty, variant, image_url}]
  shipping_address  JSONB NOT NULL,
  billing_address   JSONB,
  coupon_code       TEXT,

  subtotal          INT   NOT NULL,   -- paise, server-computed
  tax               INT   NOT NULL DEFAULT 0,
  shipping_cost     INT   NOT NULL DEFAULT 0,
  discount          INT   NOT NULL DEFAULT 0,
  total             INT   NOT NULL,

  status            TEXT  NOT NULL DEFAULT 'created',
  -- 'created' → 'consumed' (order was created from it) | 'expired'

  created_at        TIMESTAMPTZ DEFAULT now(),
  consumed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_order ON payment_intents(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON payment_intents(user_id);

-- ── payments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID  REFERENCES orders(id) ON DELETE SET NULL,
  customer_id          UUID  REFERENCES auth.users(id),

  provider             TEXT  NOT NULL DEFAULT 'razorpay',
  provider_order_id    TEXT,
  provider_payment_id  TEXT,

  amount               INT   NOT NULL,   -- paise
  currency             TEXT  NOT NULL DEFAULT 'INR',

  status               TEXT  NOT NULL DEFAULT 'pending',
  -- 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled'

  signature_verified   BOOLEAN DEFAULT false,
  payment_method       TEXT,   -- card | upi | netbanking | wallet | emi, from Razorpay
  captured_at          TIMESTAMPTZ,
  refunded_at          TIMESTAMPTZ,
  refunded_amount      INT   DEFAULT 0,

  raw_response         JSONB,  -- full Razorpay payment object, for the admin "View Raw Payment" panel

  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id);

CREATE OR REPLACE FUNCTION payments_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated ON payments;
CREATE TRIGGER payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION payments_touch_updated_at();

-- ── payment_events ────────────────────────────────────────────────
-- Append-only audit log of every webhook Razorpay sends, whether or
-- not it changed anything — this is what "Store webhook logs" means
-- and what backs the admin "View Raw Payment" / dispute investigation.
CREATE TABLE IF NOT EXISTS payment_events (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id           UUID REFERENCES payments(id) ON DELETE SET NULL,
  provider             TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id    TEXT,
  provider_payment_id  TEXT,
  event_type           TEXT NOT NULL,  -- payment.captured | payment.failed | payment.authorized | refund.processed
  payload              JSONB NOT NULL, -- raw webhook body, verbatim
  processed            BOOLEAN DEFAULT false,
  processing_error     TEXT,
  received_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_order ON payment_events(provider_order_id);

-- ── shipments (placeholder, created on successful payment) ─────────
CREATE TABLE IF NOT EXISTS shipments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | label_created | in_transit | delivered | returned
  carrier          TEXT,
  tracking_number  TEXT,
  tracking_url     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);

DROP TRIGGER IF EXISTS shipments_updated ON shipments;
CREATE TRIGGER shipments_updated BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── orders: additional payment-tracking columns ───────────────────
-- payment_status/payment_id/razorpay_order_id already existed;
-- payment_verified is new — a fast top-level check without joining
-- payments, used by the admin Orders list and the confirmation page.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments        ENABLE ROW LEVEL SECURITY;

-- payment_intents: no client policies at all, by design. Only the
-- service role (Edge Functions) can read/write — RLS has no bearing
-- on the service role, which bypasses it entirely. A customer has no
-- legitimate reason to read their own payment intent directly.

-- payments: customers can read their own; admins can read all.
-- No INSERT/UPDATE/DELETE policy for anyone but the service role —
-- this is what makes "orders are never created before payment
-- verification, and only Edge Functions write payments" enforceable
-- at the database level, not just by convention in application code.
DROP POLICY IF EXISTS "payments_own_read" ON payments;
DROP POLICY IF EXISTS "payments_admin_read" ON payments;
CREATE POLICY "payments_own_read"  ON payments FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "payments_admin_read" ON payments FOR SELECT USING (is_admin_user());

-- payment_events: admin-only (for the "View Raw Payment" / webhook
-- audit trail) — customers never need to see raw webhook payloads.
DROP POLICY IF EXISTS "payment_events_admin_read" ON payment_events;
CREATE POLICY "payment_events_admin_read" ON payment_events FOR SELECT USING (is_admin_user());

-- shipments: customers can read their own order's shipment; admins read/write all.
DROP POLICY IF EXISTS "shipments_own_read" ON shipments;
DROP POLICY IF EXISTS "shipments_admin_all" ON shipments;
CREATE POLICY "shipments_own_read" ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "shipments_admin_all" ON shipments FOR ALL USING (is_admin_user());

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- Next: deploy the three Edge Functions and set the secrets listed
-- in the project README / launch report before testing checkout.
-- ═══════════════════════════════════════════════════════════════════
