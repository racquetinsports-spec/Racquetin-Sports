-- ═══════════════════════════════════════════════════════════════════
-- Migration: Product slug history (old-link redirects)
-- ═══════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- Supports requirement: "If a slug changes, old links should redirect
-- correctly where possible." Whenever an admin renames a product's
-- slug (via updateProduct() in src/lib/api/products.js), the OLD slug
-- is recorded here. fetchProductById() checks this table as a last
-- resort when neither the current slug nor a raw UUID match, and
-- returns the product with a redirect hint so the visitor lands on
-- the product's current URL instead of a dead "not found" page.
--
-- This migration is unrelated to, but shipped alongside, the fix for
-- the "Product Not Found" bug itself — that fix was a pure code change
-- in fetchProductById() (see src/lib/api/products.js), no schema
-- change needed for the bug fix itself.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_slug_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_slug   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_slug_history_old_slug ON product_slug_history(old_slug);
CREATE INDEX IF NOT EXISTS idx_product_slug_history_product ON product_slug_history(product_id);

ALTER TABLE product_slug_history ENABLE ROW LEVEL SECURITY;

-- Public read (needed so a logged-out visitor's old link still
-- redirects, not just logged-in ones), admin-only write (only
-- updateProduct() should ever insert into this).
DROP POLICY IF EXISTS "product_slug_history_public_read" ON product_slug_history;
DROP POLICY IF EXISTS "product_slug_history_admin_write" ON product_slug_history;
CREATE POLICY "product_slug_history_public_read" ON product_slug_history FOR SELECT USING (true);
CREATE POLICY "product_slug_history_admin_write" ON product_slug_history FOR INSERT WITH CHECK (is_admin_user());

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
