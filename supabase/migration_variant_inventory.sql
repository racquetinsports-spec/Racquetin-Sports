-- ═══════════════════════════════════════════════════════════════════
-- Migration: Variant-level inventory (sizes, stock-per-variant)
-- ═══════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Additive and backward-compatible:
-- existing racquet products using cart_items.variant (a free-form JSONB
-- tag for grip/color, with no real stock tracking) continue to work
-- exactly as before — this does not touch that column or force every
-- product onto product_variants. It only adds what shoes (and any
-- future product needing real per-option stock) actually need:
-- product_variants rows with their own stock, referenced by id from
-- cart_items/order_items, so a "UK8" line item is tied to the exact
-- variant record whose stock gets deducted — not a loose text label.
-- ═══════════════════════════════════════════════════════════════════

-- Prevent duplicate size rows for the same product (e.g. two "UK8" rows).
ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_unique_option UNIQUE (product_id, name, value);

-- cart_items: add variant_id alongside the existing variant JSONB column
-- (kept for racquet grip/color tags, which have no per-option stock to
-- track). A cart line uses ONE of the two: variant_id when the product
-- has real product_variants rows (shoes), variant JSONB otherwise.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Replace the old uniqueness rule with one that also considers variant_id
-- (NULLs never conflict with each other in a unique constraint, so this
-- is safe for existing rows where variant_id is NULL).
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_variant_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_unique_line UNIQUE (user_id, product_id, variant, variant_id);

-- order_items: same addition, for traceability — an admin should be
-- able to see exactly which sized variant a past order line was for.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

-- Variant-aware stock deduction — mirrors decrement_stock() (which
-- remains untouched, and keeps handling every product with no variant
-- selected, e.g. racquets) but targets a specific product_variants row.
-- Called from fulfillOrderFromIntent only after signature-verified
-- payment, exactly like the product-level version.
CREATE OR REPLACE FUNCTION decrement_variant_stock(variant_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock = GREATEST(0, stock - qty)
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
