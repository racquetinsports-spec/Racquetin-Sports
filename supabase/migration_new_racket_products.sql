-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add 9 new racket products (Li-Ning ×7, Hundred ×2)
-- ═══════════════════════════════════════════════════════════════════
-- Run this once in the Supabase SQL editor. Safe to re-run — every
-- INSERT uses the same ON CONFLICT (slug) pattern as seed_products.sql,
-- so re-running just updates price/stock/description rather than
-- duplicating rows.
--
-- Pricing note: despite the `-- stored in paise` comment on
-- products.price in schema.sql, every existing seeded product (see
-- seed_products.sql, e.g. Arcsaber 7 Tour = 14999) is actually stored
-- in plain rupees — the comment is stale, not the real convention.
-- These follow the real, established convention to stay consistent
-- with the rest of the catalogue and with what create-razorpay-order
-- already expects (it was fixed earlier this session to treat
-- products.price as rupees).
--
-- Hyfonic 7 and Nivrix 70 Volta have no price yet ("Pending" in the
-- request). products.price is NOT NULL with no existing "draft" or
-- null-price convention anywhere in this schema or the admin form
-- (the admin form itself falls back to 0 when price is left blank —
-- see AdminPages.jsx's formToPayload). Rather than invent a price,
-- these follow that same fallback (price = 0) and are set
-- is_active = false, so they exist in the catalogue and are ready to
-- price from the admin Products page, but cannot be seen or
-- accidentally purchased on the live storefront until a real price is
-- set and they're activated.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Blade X 700
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'blade-x-700', 'Blade X 700', 'Li-Ning', 'Blade X', 'BLX700', 'rackets',
  13500, NULL, 2,
  'Intermediate', 'All-Round', '3 months manufacturer warranty',
  '{"skillLevel":"Intermediate"}'::jsonb,
  'The Blade X 700 is part of Li-Ning''s control-oriented Blade X series, built for players who want a manoeuvrable, quick-swinging racket for fast net exchanges and doubles play.',
  ARRAY['Teal'], ARRAY['li-ning','blade-x','all-round'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/blade-x-700.webp', true, 0 FROM products WHERE slug = 'blade-x-700'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/blade-x-700-2.webp', false, 1 FROM products WHERE slug = 'blade-x-700'
ON CONFLICT DO NOTHING;

-- 2. Blade X 800
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'blade-x-800', 'Blade X 800', 'Li-Ning', 'Blade X', 'BLX800', 'rackets',
  14000, NULL, 2,
  'Intermediate', 'All-Round', '3 months manufacturer warranty',
  '{"skillLevel":"Intermediate"}'::jsonb,
  'A step up from the Blade X 700, the Blade X 800 carries the same fast, control-first handling with a head-light balance suited to quick net play and doubles rotation.',
  ARRAY['Dark Green'], ARRAY['li-ning','blade-x','all-round'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/blade-x-800.webp', true, 0 FROM products WHERE slug = 'blade-x-800'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/blade-x-800-2.webp', false, 1 FROM products WHERE slug = 'blade-x-800'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/blade-x-800-3.webp', false, 2 FROM products WHERE slug = 'blade-x-800'
ON CONFLICT DO NOTHING;

-- 3. Calibar 900C Combat
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'calibar-900c-combat', 'Calibar 900C Combat', 'Li-Ning', 'Calibar', 'CAL900C', 'rackets',
  15000, NULL, 3,
  'Advanced', 'Attacking', '3 months manufacturer warranty',
  '{"skillLevel":"Advanced"}'::jsonb,
  'The Calibar 900C Combat is built for attacking doubles players, with a design geared toward fast flat drives and aggressive net kills at the front of the court.',
  ARRAY['Black/Green'], ARRAY['li-ning','calibar','attacking'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/calibar-900c-combat.webp', true, 0 FROM products WHERE slug = 'calibar-900c-combat'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/calibar-900c-combat-2.webp', false, 1 FROM products WHERE slug = 'calibar-900c-combat'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/calibar-900c-combat-3.webp', false, 2 FROM products WHERE slug = 'calibar-900c-combat'
ON CONFLICT DO NOTHING;

-- 4. Axforce 70
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'axforce-70', 'Axforce 70', 'Li-Ning', 'Axforce', 'AXF70', 'rackets',
  13500, NULL, 4,
  'Intermediate', 'All-Round', '3 months manufacturer warranty',
  '{"skillLevel":"Intermediate"}'::jsonb,
  'The Axforce 70 is a control-focused racket from Li-Ning''s Axforce line, offering a flexible shaft that helps generate power on drives and clears without sacrificing touch at the net.',
  ARRAY['Black/Teal'], ARRAY['li-ning','axforce','all-round'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/axforce-70.webp', true, 0 FROM products WHERE slug = 'axforce-70'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/axforce-70-2.webp', false, 1 FROM products WHERE slug = 'axforce-70'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/axforce-70-3.webp', false, 2 FROM products WHERE slug = 'axforce-70'
ON CONFLICT DO NOTHING;

-- 5. Aeronaut 9000 I
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'aeronaut-9000-i', 'Aeronaut 9000 I', 'Li-Ning', 'Aeronaut', 'AER9000I', 'rackets',
  15000, NULL, 2,
  'Advanced', 'Attacking', '3 months manufacturer warranty',
  '{"skillLevel":"Advanced"}'::jsonb,
  'The Aeronaut 9000 I is built around Li-Ning''s aerodynamic frame shaping, designed to cut through the air faster for quicker swing speed on smashes and attacking clears.',
  ARRAY['White/Gold'], ARRAY['li-ning','aeronaut','attacking'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/aeronaut-9000-i.webp', true, 0 FROM products WHERE slug = 'aeronaut-9000-i'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/aeronaut-9000-i-2.webp', false, 1 FROM products WHERE slug = 'aeronaut-9000-i'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/aeronaut-9000-i-3.webp', false, 2 FROM products WHERE slug = 'aeronaut-9000-i'
ON CONFLICT DO NOTHING;

-- 6. Halbertec 7000
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'halbertec-7000', 'Halbertec 7000', 'Li-Ning', 'Halbertec', 'HAL7000', 'rackets',
  14000, NULL, 1,
  'Advanced', 'Attacking', '3 months manufacturer warranty',
  '{"skillLevel":"Advanced"}'::jsonb,
  'The Halbertec 7000 is a power-oriented racket from Li-Ning''s Halbertec line, favouring players who generate their own pace and want extra weight behind smashes.',
  ARRAY['Black/White/Pink'], ARRAY['li-ning','halbertec','attacking'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/halbertec-7000.webp', true, 0 FROM products WHERE slug = 'halbertec-7000'
ON CONFLICT DO NOTHING;

-- 7. Halbertec 5000
INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, warranty, specs, description, colors, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'halbertec-5000', 'Halbertec 5000', 'Li-Ning', 'Halbertec', 'HAL5000', 'rackets',
  9000, NULL, 1,
  'Intermediate', 'Attacking', '3 months manufacturer warranty',
  '{"skillLevel":"Intermediate"}'::jsonb,
  'The Halbertec 5000 brings the same power-first philosophy as the rest of the Halbertec line into a more accessible entry point for intermediate attacking players.',
  ARRAY['Purple/White'], ARRAY['li-ning','halbertec','attacking'],
  0, 0, true, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/halbertec-5000.webp', true, 0 FROM products WHERE slug = 'halbertec-5000'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/halbertec-5000-2.webp', false, 1 FROM products WHERE slug = 'halbertec-5000'
ON CONFLICT DO NOTHING;

-- 8. Hyfonic 7 (Hundred) — price pending, kept inactive until priced
INSERT INTO products (
  slug, name, brand, series, category_slug, price, original_price, stock,
  description, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'hyfonic-7', 'Hyfonic 7', 'Hundred', 'Hyfonic', 'rackets',
  0, NULL, 1,
  'Pricing for the Hyfonic 7 has not been finalised yet. This listing is prepared and ready — set a price and activate it from Admin → Products.',
  ARRAY['hundred','hyfonic'],
  0, 0, false, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

-- 9. Nivrix 70 Volta (Hundred) — price pending, kept inactive until priced
INSERT INTO products (
  slug, name, brand, series, category_slug, price, original_price, stock,
  description, tags,
  rating, review_count, is_active, is_best_seller, is_new_arrival
) VALUES (
  'nivrix-70-volta', 'Nivrix 70 Volta', 'Hundred', 'Nivrix', 'rackets',
  0, NULL, 1,
  'Pricing for the Nivrix 70 Volta has not been finalised yet. This listing is prepared and ready — set a price and activate it from Admin → Products.',
  ARRAY['hundred','nivrix'],
  0, 0, false, false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- No images were matched for Hyfonic 7 or Nivrix 70 Volta, and 3
-- uploaded images (a teal/red bicolour Li-Ning racket, no visible
-- model name matching any of the 9 requested products) could not be
-- confidently matched to anything on this list — see the chat report
-- for details. Neither product has product_images rows yet; add them
-- from Admin → Products once a real product image is available.
-- ═══════════════════════════════════════════════════════════════════
