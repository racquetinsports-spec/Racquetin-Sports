-- ═══════════════════════════════════════════════════════════════════
-- Migration: Email-verified welcome email webhook
-- ═══════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL editor. Safe to re-run — CREATE OR
-- REPLACE TRIGGER updates the existing trigger in place rather than
-- erroring or duplicating it.
--
-- What this does: fires the on-email-verified Edge Function exactly
-- once, server-side, the moment a user's auth.users.email_confirmed_at
-- transitions from null to a real timestamp (i.e. the instant they
-- click the verification link) — NOT on every subsequent update to
-- that row. This is the same underlying mechanism as Supabase
-- Dashboard's "Database Webhooks" feature (Database → Webhooks); it's
-- written here as SQL instead of clicked through the UI so it's
-- reproducible and reviewable, but you can equivalently set this up
-- via that Dashboard page if you'd rather not run SQL against the
-- auth schema.
--
-- BEFORE RUNNING THIS:
--   1. Deploy the on-email-verified Edge Function first (paste
--      supabase/functions_flattened/on-email-verified.ts into the
--      Dashboard, same as the payment functions).
--   2. Set an Edge Function secret EMAIL_WEBHOOK_SECRET to any long
--      random string (Project Settings → Edge Functions → Secrets).
--      Use the SAME value in the x-webhook-secret header below —
--      replace the placeholder before running this.
--   3. Confirm your project ref below matches yours (Project Settings
--      → General → Reference ID). This was inferred from an earlier
--      deploy error in this project (zuuwojbyjnymklwduutl) — double
--      check it before running.

create or replace trigger on_auth_user_email_verified
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function supabase_functions.http_request(
    'https://zuuwojbyjnymklwduutl.supabase.co/functions/v1/on-email-verified',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"REPLACE_WITH_YOUR_EMAIL_WEBHOOK_SECRET"}',
    '{}',
    '5000'
  );

-- To remove this later:
--   drop trigger if exists on_auth_user_email_verified on auth.users;
