-- ─────────────────────────────────────────────────────────────────
-- Fix: infinite recursion in admin_users RLS policy
-- ─────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor against your existing
-- project. Safe to run even though admin_users already has data —
-- it only replaces a function and one policy, it doesn't touch rows.
--
-- Root cause: the "admin_users_super" policy queried admin_users
-- directly inside its own USING clause instead of going through a
-- SECURITY DEFINER function. Since that policy is FOR ALL (which
-- includes SELECT), evaluating it for any SELECT on admin_users
-- required re-evaluating the same policy on the nested query —
-- forever. Postgres detects this as infinite recursion and fails
-- the whole query with an error, which is why a real super_admin
-- row could exist and the app would still show 403: the read of
-- admin_users was failing at the database level, not because the
-- role check was wrong on the client.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "admin_users_super" ON admin_users;
CREATE POLICY "admin_users_super" ON admin_users FOR ALL USING (is_super_admin());

-- Verify: this should now return your row without error.
-- (Run as the authenticated user, e.g. via the app, not the SQL editor's
-- service-role connection — the SQL editor bypasses RLS entirely, so it
-- won't reproduce the bug either way.)
-- select id, user_id, role, created_at from admin_users where user_id = auth.uid();
