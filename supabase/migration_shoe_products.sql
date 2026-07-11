-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add 10 shoe products with real per-size variant inventory
-- ═══════════════════════════════════════════════════════════════════
-- Run AFTER migration_variant_inventory.sql (relies on that
-- migration's product_variants unique constraint and variant_id
-- columns already existing).
--
-- No prices were provided for any of these 10 products. Following the
-- same convention established for Hyfonic 7 / Nivrix 70 Volta earlier
-- (products.price is NOT NULL, no draft-price concept exists in this
-- schema): price = 0, is_active = false. Every product is fully
-- staged — real variants, real per-size stock — but invisible and
-- unpurchasable on the live storefront until priced and activated
-- from Admin -> Products.
--
-- Images: only Halberd Strike has confirmed images (its model name is
-- printed directly on the shoe). The other 9 have none yet — see the
-- chat response for the 6 distinct physical shoes identified among
-- the remaining uploads, none confirmable to a specific model name.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Li-Ning Halberd Strike
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('halberd-strike', 'Halberd Strike', 'Li-Ning', 'Halberd', 'shoes', 0, 13,
  'The Halberd Strike is Li-Ning''s badminton court shoe built for quick lateral movement and stable landings during fast rallies.',
  ARRAY['li-ning','halberd-strike','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK7', 1, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK7.5', 1, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK8', 3, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK8.5', 2, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK9', 3, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK9.5', 2, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK11', 1, true FROM products WHERE slug = 'halberd-strike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/shoes/halberd-strike.webp', true, 0 FROM products WHERE slug = 'halberd-strike'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/shoes/halberd-strike-2.webp', false, 1 FROM products WHERE slug = 'halberd-strike'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/shoes/halberd-strike-3.webp', false, 2 FROM products WHERE slug = 'halberd-strike'
ON CONFLICT DO NOTHING;

-- 2. Hundred Phenom
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('phenom', 'Phenom', 'Hundred', 'Phenom', 'shoes', 0, 1,
  'The Phenom is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','phenom','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK8', 1, true FROM products WHERE slug = 'phenom'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 3. Hundred Court Sonic PBX
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('court-sonic-pbx', 'Court Sonic PBX', 'Hundred', 'Court Sonic', 'shoes', 0, 10,
  'The Court Sonic PBX is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','court-sonic-pbx','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK8', 5, true FROM products WHERE slug = 'court-sonic-pbx'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK9', 5, true FROM products WHERE slug = 'court-sonic-pbx'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 4. Hundred Hyper Court Shield
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('hyper-court-shield', 'Hyper Court Shield', 'Hundred', 'Hyper Court', 'shoes', 0, 2,
  'The Hyper Court Shield is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','hyper-court-shield','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK7', 1, true FROM products WHERE slug = 'hyper-court-shield'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK11', 1, true FROM products WHERE slug = 'hyper-court-shield'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 5. Hundred Hyper Spike
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('hyper-spike', 'Hyper Spike', 'Hundred', 'Hyper', 'shoes', 0, 4,
  'The Hyper Spike is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','hyper-spike','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK6', 1, true FROM products WHERE slug = 'hyper-spike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK8', 1, true FROM products WHERE slug = 'hyper-spike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK11', 2, true FROM products WHERE slug = 'hyper-spike'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 6. Hundred Hyper Court
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('hyper-court', 'Hyper Court', 'Hundred', 'Hyper Court', 'shoes', 0, 1,
  'The Hyper Court is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','hyper-court','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK9', 1, true FROM products WHERE slug = 'hyper-court'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 7. Hundred Court Champion
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('court-champion', 'Court Champion', 'Hundred', 'Court Champion', 'shoes', 0, 5,
  'The Court Champion is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','court-champion','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK3', 4, true FROM products WHERE slug = 'court-champion'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK5', 1, true FROM products WHERE slug = 'court-champion'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 8. Hundred Quantum Boom
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('quantum-boom', 'Quantum Boom', 'Hundred', 'Quantum', 'shoes', 0, 1,
  'The Quantum Boom is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','quantum-boom','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK7', 1, true FROM products WHERE slug = 'quantum-boom'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 9. Hundred Blade Lite
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('blade-lite', 'Blade Lite', 'Hundred', 'Blade', 'shoes', 0, 3,
  'The Blade Lite is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','blade-lite','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK7', 1, true FROM products WHERE slug = 'blade-lite'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK11', 2, true FROM products WHERE slug = 'blade-lite'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- 10. Hundred Court Star Pro
INSERT INTO products (slug, name, brand, series, category_slug, price, stock, description, tags, rating, review_count, is_active, is_best_seller, is_new_arrival)
VALUES ('court-star-pro', 'Court Star Pro', 'Hundred', 'Court Star', 'shoes', 0, 8,
  'The Court Star Pro is a badminton court shoe from Hundred''s footwear line.',
  ARRAY['hundred','court-star-pro','footwear'], 0, 0, false, false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, stock = EXCLUDED.stock, updated_at = now();

INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK4', 2, true FROM products WHERE slug = 'court-star-pro'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK5', 2, true FROM products WHERE slug = 'court-star-pro'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK6', 1, true FROM products WHERE slug = 'court-star-pro'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK11', 1, true FROM products WHERE slug = 'court-star-pro'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;
INSERT INTO product_variants (product_id, name, value, stock, is_active)
SELECT id, 'Size', 'UK12', 2, true FROM products WHERE slug = 'court-star-pro'
ON CONFLICT (product_id, name, value) DO UPDATE SET stock = EXCLUDED.stock;


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
