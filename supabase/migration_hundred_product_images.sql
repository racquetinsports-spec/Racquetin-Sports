-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add images for Hyfonic 7 and Nivrix 70 Volta
-- ═══════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Follow-up to
-- migration_new_racket_products.sql — those two products were created
-- with no images (none were available at the time). This just adds
-- product_images rows; it does not touch price or is_active, since
-- both products are still pending a real price (see the earlier
-- migration's notes on why price = 0 / is_active = false was used).
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/hyfonic-7.webp', true, 0 FROM products WHERE slug = 'hyfonic-7'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/hyfonic-7-2.webp', false, 1 FROM products WHERE slug = 'hyfonic-7'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/hyfonic-7-3.webp', false, 2 FROM products WHERE slug = 'hyfonic-7'
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nivrix-70-volta.webp', true, 0 FROM products WHERE slug = 'nivrix-70-volta'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nivrix-70-volta-2.webp', false, 1 FROM products WHERE slug = 'nivrix-70-volta'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nivrix-70-volta-3.webp', false, 2 FROM products WHERE slug = 'nivrix-70-volta'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- Both products remain price = 0, is_active = false. They now have
-- full image galleries and are otherwise ready — set a real price and
-- flip Active on from Admin → Products whenever you're ready to list them.
-- ═══════════════════════════════════════════════════════════════════
