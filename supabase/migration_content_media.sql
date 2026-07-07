-- ─────────────────────────────────────────────────────────────────
-- Migration: Content Management + Media Library support
-- ─────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor against your existing
-- project. Safe to run — everything here is additive (new tables,
-- new columns with defaults, new storage buckets), nothing existing
-- is dropped or altered destructively.
-- ─────────────────────────────────────────────────────────────────

-- ── Site content (freeform CMS copy) ──────────────────────────────
-- Simple key/value store for editable website text that doesn't fit
-- a dedicated column (hero copy, brand story, newsletter section,
-- footer text, About page copy). Reusable for any future section
-- without another migration — the admin Content Management page
-- reads/writes this by key.
CREATE TABLE IF NOT EXISTS site_content (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_content_public_read" ON site_content;
DROP POLICY IF EXISTS "site_content_admin_write" ON site_content;
CREATE POLICY "site_content_public_read" ON site_content FOR SELECT USING (true);
CREATE POLICY "site_content_admin_write" ON site_content FOR ALL USING (is_admin_user());

CREATE OR REPLACE FUNCTION site_content_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_content_updated ON site_content;
CREATE TRIGGER site_content_updated BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION site_content_touch_updated_at();

-- Seed the keys the admin Content Management page edits, so a fresh
-- read always finds a row (upsert-friendly, never breaks on a missing key).
INSERT INTO site_content (key, value) VALUES
  ('homepage.hero_title',        'Engineered for Speed'),
  ('homepage.hero_subtitle',     'Precision badminton equipment for players who demand more.'),
  ('homepage.hero_cta',          'Shop Rackets'),
  ('homepage.brand_story_title', 'Built for players who notice the difference.'),
  ('homepage.brand_story_body',  'RacquetIn started with a straightforward conviction: the equipment most players settle for is rarely the equipment they deserve.'),
  ('homepage.newsletter_title',  'Stay in the loop'),
  ('homepage.newsletter_body',   'New arrivals, restocks, and player stories — no spam.'),
  ('footer.text',                'RacquetIn — Precision badminton equipment.'),
  ('footer.copyright',           ''),
  ('about.mission',              'To close the gap between what premium badminton equipment is capable of and what most brands choose to offer.'),
  ('about.vision',               'A world where every serious player has access to equipment engineered to professional standards.'),
  ('about.story',                'RacquetIn was founded by players who were tired of choosing between price and performance.'),
  ('contact.faq_intro',          'Answers to the questions we hear most often.')
ON CONFLICT (key) DO NOTHING;

-- ── FAQs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faqs_public_read" ON faqs;
DROP POLICY IF EXISTS "faqs_admin_write" ON faqs;
CREATE POLICY "faqs_public_read" ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "faqs_admin_write" ON faqs FOR ALL USING (is_admin_user());

DROP TRIGGER IF EXISTS faqs_updated ON faqs;
CREATE TRIGGER faqs_updated BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Extend site_settings with brand color + extra contact/analytics fields ──
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS primary_color   TEXT DEFAULT '#002B6B';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0040a0';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS whatsapp        TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS meta_pixel_id   TEXT;

-- ── Storage buckets for the Media Library ─────────────────────────
-- These were previously commented-out suggestions in schema.sql —
-- the admin Media Library needs them to actually exist to upload to.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (both buckets are public: true above, but storage still
-- needs explicit policies on storage.objects), admin-only write.
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('product-images', 'site-assets'));

DROP POLICY IF EXISTS "storage_admin_write" ON storage.objects;
CREATE POLICY "storage_admin_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());

DROP POLICY IF EXISTS "storage_admin_update" ON storage.objects;
CREATE POLICY "storage_admin_update" ON storage.objects FOR UPDATE
  USING (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());

DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;
CREATE POLICY "storage_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());

-- ─────────────────────────────────────────────────────────────────
-- MIGRATION COMPLETE
-- ─────────────────────────────────────────────────────────────────
