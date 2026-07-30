-- ═══════════════════════════════════════════════════════════════════
-- Migration: Guest checkout
-- ═══════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Additive/relaxing only — no
-- data is deleted, no existing row becomes invalid.
--
-- orders.user_id was ALREADY nullable before this migration (verified
-- directly against the schema) — nothing to change there. The actual
-- blocker was one level upstream: payment_intents.user_id is created
-- BEFORE any order exists, and was NOT NULL.

ALTER TABLE payment_intents ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Guest/registered distinction is inferred from user_id IS NULL
-- everywhere (orders and payment_intents both) rather than a separate
-- flag column — one source of truth instead of two fields that could
-- drift out of sync with each other.

-- RLS: the existing "orders_own" policy (user_id = auth.uid()) already
-- correctly denies guests read access via the normal client query —
-- that's intentional, not a gap to patch here. Guest order lookups
-- (the post-checkout confirmation page, and any future "track your
-- order" feature) go through a dedicated Edge Function using the
-- admin/service-role client instead, which bypasses RLS under
-- server-side control. Nothing to change in RLS itself for this.

-- To revert:
--   ALTER TABLE payment_intents ALTER COLUMN user_id SET NOT NULL;  -- only safe if no null rows exist
--   ALTER TABLE payment_intents DROP COLUMN IF EXISTS guest_email;
