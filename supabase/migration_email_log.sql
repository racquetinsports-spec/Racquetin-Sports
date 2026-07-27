-- ═══════════════════════════════════════════════════════════════════
-- Migration: Email log + idempotency
-- ═══════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Purely additive — creates one
-- new table, does not touch or delete any existing data.
--
-- Why: neither of the two emails currently sent (order confirmation,
-- verification welcome) had any durable record of having been sent —
-- duplicate-prevention for order confirmation existed only as a side
-- effect of the order-creation idempotency check, with no way to see
-- "did this specific email actually go out" after the fact, and no
-- foundation for an admin resend tool. This table is that foundation.
--
-- idempotency_key has a UNIQUE constraint — sending code inserts a
-- 'pending' row with a deterministic key (e.g. order_confirmation:
-- {order_id}) BEFORE calling Resend; a duplicate call's insert fails
-- on the unique constraint, which is treated as "already handled,
-- skip" rather than sending twice.

CREATE TABLE IF NOT EXISTS email_log (
  id                    UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type            TEXT  NOT NULL,   -- 'welcome' | 'order_confirmation' | (future: shipment_packed, etc.)
  recipient             TEXT  NOT NULL,
  customer_id           UUID,             -- stores auth.users.id (same id used as customers.user_id) — nullable since not every email is tied to a customer
  order_id              UUID  REFERENCES orders(id) ON DELETE SET NULL,
  shipment_id           UUID  REFERENCES shipments(id) ON DELETE SET NULL,
  provider              TEXT  NOT NULL DEFAULT 'resend',
  provider_message_id   TEXT,
  idempotency_key       TEXT  NOT NULL UNIQUE,
  status                TEXT  NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed' | 'skipped'
  attempt_count         INT   NOT NULL DEFAULT 0,
  last_error            TEXT,
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type_status ON email_log(email_type, status);

-- Service-role only for writes (Edge Functions use the admin client,
-- which bypasses RLS) — matching payment_events' convention exactly:
-- no client-side write access at all, admins can read via is_admin_user()
-- for when an admin email-log view gets built.
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_log_admin_read" ON email_log FOR SELECT USING (is_admin_user());

-- To remove this later:
--   drop table if exists email_log;
