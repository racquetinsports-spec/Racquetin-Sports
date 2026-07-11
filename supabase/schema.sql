-- ═══════════════════════════════════════════════════════════════════
-- RacquetIn — Supabase Database Schema
-- ═══════════════════════════════════════════════════════════════════
-- Run this file in the Supabase SQL Editor to set up the database.
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- for full-text search

-- ── Helpers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  meta_title  TEXT,
  meta_desc   TEXT,
  sort_order  INT         DEFAULT 0,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO categories (name, slug, sort_order) VALUES
  ('Rackets',      'rackets',      1),
  ('Shoes',        'shoes',        2),
  ('Bags',         'bags',         3),
  ('Shuttlecocks', 'shuttlecocks', 4),
  ('Strings',      'strings',      5),
  ('Grips',        'grips',        6),
  ('Apparel',      'apparel',      7)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  brand            TEXT,
  series           TEXT,
  series_code      TEXT,
  category_slug    TEXT    NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  price            INT     NOT NULL,          -- stored in paise (integer)
  original_price   INT,                       -- for sale items
  stock            INT     NOT NULL DEFAULT 0,
  sku              TEXT    UNIQUE,

  -- Racket-specific fields
  player_level     TEXT,    -- 'Beginner', 'Intermediate', 'Advanced', 'Professional'
  playing_style    TEXT,    -- 'Attacking', 'Defensive', 'All-Round'
  balance          TEXT,    -- 'Head-Heavy', 'Even Balance', 'Head-Light'
  flex             TEXT,    -- 'Flexible', 'Medium', 'Stiff', 'Extra Stiff'
  weight_spec      TEXT,    -- e.g. '83g (±2g)'
  frame_material   TEXT,
  shaft_material   TEXT,
  max_tension      TEXT,
  recommended_string TEXT,
  in_box           TEXT[],  -- array of included items
  warranty         TEXT,

  -- General specs (JSON for flexibility)
  specs            JSONB    DEFAULT '{}',
  technologies     TEXT[]   DEFAULT '{}',

  description      TEXT,
  badge            TEXT,    -- 'Best Seller', 'New', 'Pro Choice', 'Limited Edition'
  colors           TEXT[]   DEFAULT '{}',
  tags             TEXT[]   DEFAULT '{}',
  rating           NUMERIC(3,2) DEFAULT 0,
  review_count     INT      DEFAULT 0,

  -- Merchandising
  is_active        BOOLEAN  DEFAULT true,
  is_best_seller   BOOLEAN  DEFAULT false,
  is_new_arrival   BOOLEAN  DEFAULT false,
  is_featured      BOOLEAN  DEFAULT false,
  sort_order       INT      DEFAULT 0,

  -- Metadata
  meta_title       TEXT,
  meta_desc        TEXT,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_category  ON products(category_slug);
CREATE INDEX idx_products_brand     ON products(brand);
CREATE INDEX idx_products_series    ON products(series);
CREATE INDEX idx_products_active    ON products(is_active);
CREATE INDEX idx_products_search    ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(brand,'') || ' ' || COALESCE(description,'')));
CREATE TRIGGER products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Records a product's previous slug whenever an admin renames it
-- (see updateProduct() in src/lib/api/products.js), so an old shared
-- or bookmarked link can still redirect to the product's current URL
-- instead of showing "not found".
CREATE TABLE IF NOT EXISTS product_slug_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_slug   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_product_slug_history_old_slug ON product_slug_history(old_slug);
CREATE INDEX idx_product_slug_history_product ON product_slug_history(product_id);

-- ─────────────────────────────────────────────────────────────────
-- PRODUCT IMAGES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url          TEXT  NOT NULL,
  storage_path TEXT,          -- Supabase Storage path for deletion
  alt_text     TEXT,
  is_primary   BOOLEAN DEFAULT false,
  sort_order   INT     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ─────────────────────────────────────────────────────────────────
-- PRODUCT VARIANTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT  NOT NULL,   -- e.g. 'Color', 'Grip Size', 'Size'
  value      TEXT  NOT NULL,   -- e.g. 'Graphite Black', 'G4', 'M'
  sku_suffix TEXT,
  price_adj  INT   DEFAULT 0,  -- price adjustment in paise
  stock      INT   DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, name, value)
);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ─────────────────────────────────────────────────────────────────
-- CUSTOMERS (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID  NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create customer record on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- CUSTOMER ADDRESSES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_addresses (
  id            UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT,   -- 'Home', 'Work', etc.
  full_name     TEXT  NOT NULL,
  phone         TEXT,
  line1         TEXT  NOT NULL,
  line2         TEXT,
  city          TEXT  NOT NULL,
  state         TEXT  NOT NULL,
  pincode       TEXT  NOT NULL,
  country       TEXT  DEFAULT 'India',
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_addresses_user ON customer_addresses(user_id);

-- ─────────────────────────────────────────────────────────────────
-- ADMIN USERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID  NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT  NOT NULL DEFAULT 'admin', -- 'admin' | 'super_admin'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      TEXT  UNIQUE NOT NULL DEFAULT 'RI-' || to_char(now(), 'YYYYMM') || '-' || LPAD(floor(random()*999999)::TEXT, 6, '0'),
  user_id           UUID  REFERENCES auth.users(id),

  status            TEXT  NOT NULL DEFAULT 'pending',
  -- 'pending' → 'processing' → 'shipped' → 'delivered' | 'cancelled' | 'returned'

  payment_status    TEXT  NOT NULL DEFAULT 'pending',
  -- 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled'
  payment_id        TEXT,      -- Razorpay payment_id
  razorpay_order_id TEXT,      -- Razorpay order_id
  payment_verified  BOOLEAN DEFAULT false,  -- true only once Edge Function signature verification succeeds
  payment_method    TEXT,      -- card | upi | netbanking | wallet | emi, from Razorpay

  subtotal          INT   NOT NULL,   -- in paise
  tax               INT   DEFAULT 0,
  shipping_cost     INT   DEFAULT 0,
  discount          INT   DEFAULT 0,
  total             INT   NOT NULL,

  shipping_address  JSONB NOT NULL,
  billing_address   JSONB,
  coupon_code       TEXT,
  notes             TEXT,

  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_orders_user   ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date   ON orders(created_at DESC);
CREATE TRIGGER orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID  REFERENCES products(id) ON DELETE SET NULL,
  name         TEXT  NOT NULL,  -- snapshot at time of order
  price        INT   NOT NULL,  -- snapshot in paise
  qty          INT   NOT NULL,
  variant      JSONB DEFAULT '{}',
  variant_id   UUID  REFERENCES product_variants(id) ON DELETE SET NULL, -- exact sized variant purchased, if any
  image_url    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ─────────────────────────────────────────────────────────────────
-- PAYMENTS (production Razorpay architecture)
-- ─────────────────────────────────────────────────────────────────
-- The frontend never creates orders or payment records directly —
-- only the create-razorpay-order / verify-razorpay-payment /
-- razorpay-webhook Edge Functions (service role) write to these
-- tables. See supabase/functions/ and RLS below.

-- Staging table bridging "Razorpay order created" and "payment
-- verified" — the server-computed items/prices/totals are snapshotted
-- here so verification never has to trust anything the client resends.
CREATE TABLE IF NOT EXISTS payment_intents (
  id                UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          TEXT  NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT  UNIQUE NOT NULL,
  items             JSONB NOT NULL,
  shipping_address  JSONB NOT NULL,
  billing_address   JSONB,
  coupon_code       TEXT,
  subtotal          INT   NOT NULL,
  tax               INT   NOT NULL DEFAULT 0,
  shipping_cost     INT   NOT NULL DEFAULT 0,
  discount          INT   NOT NULL DEFAULT 0,
  total             INT   NOT NULL,
  status            TEXT  NOT NULL DEFAULT 'created', -- created | consumed | expired
  created_at        TIMESTAMPTZ DEFAULT now(),
  consumed_at       TIMESTAMPTZ
);
CREATE INDEX idx_payment_intents_provider_order ON payment_intents(provider_order_id);
CREATE INDEX idx_payment_intents_user ON payment_intents(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id                   UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id             UUID  REFERENCES orders(id) ON DELETE SET NULL,
  customer_id          UUID  REFERENCES auth.users(id),
  provider             TEXT  NOT NULL DEFAULT 'razorpay',
  provider_order_id    TEXT,
  provider_payment_id  TEXT,
  amount               INT   NOT NULL,
  currency             TEXT  NOT NULL DEFAULT 'INR',
  status               TEXT  NOT NULL DEFAULT 'pending',
  -- 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled'
  signature_verified   BOOLEAN DEFAULT false,
  payment_method       TEXT,
  captured_at          TIMESTAMPTZ,
  refunded_at          TIMESTAMPTZ,
  refunded_amount      INT DEFAULT 0,
  raw_response         JSONB,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_provider_payment ON payments(provider_payment_id);
CREATE INDEX idx_payments_provider_order ON payments(provider_order_id);
CREATE TRIGGER payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Append-only webhook audit log.
CREATE TABLE IF NOT EXISTS payment_events (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id           UUID REFERENCES payments(id) ON DELETE SET NULL,
  provider             TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id    TEXT,
  provider_payment_id  TEXT,
  event_type           TEXT NOT NULL,
  payload              JSONB NOT NULL,
  processed            BOOLEAN DEFAULT false,
  processing_error     TEXT,
  received_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_provider_order ON payment_events(provider_order_id);

-- Shipment placeholder, created once payment is verified.
CREATE TABLE IF NOT EXISTS shipments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'shiprocket' | 'delhivery' | 'nimbuspost' ...
  shipment_status     TEXT NOT NULL DEFAULT 'pending', -- pending | packed | shipped | in_transit | delivered | cancelled | returned
  courier_name        TEXT,
  tracking_number     TEXT,
  tracking_url        TEXT,
  estimated_delivery  TIMESTAMPTZ,
  label_url           TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE TRIGGER shipments_updated BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Append-only shipment timeline — shown to the customer on /account and
-- used as the admin audit trail. See supabase/migration_delivery_system.sql
-- for the full design rationale (provider-agnostic delivery system).
CREATE TABLE IF NOT EXISTS shipment_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL, -- pending | packed | shipped | in_transit | delivered | cancelled | returned | note
  description  TEXT,
  location     TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX idx_shipment_events_occurred ON shipment_events(occurred_at);

-- Pluggable courier registry — 'manual' today, a real courier can be
-- added later purely as a new row + a new provider implementation
-- (src/lib/shipping/), with no schema or UI change required.
CREATE TABLE IF NOT EXISTS delivery_providers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  config     JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO delivery_providers (slug, name, is_active, config) VALUES
  ('manual', 'Manual (entered by admin)', true, '{}')
ON CONFLICT (slug) DO NOTHING;
CREATE TRIGGER delivery_providers_updated BEFORE UPDATE ON delivery_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- CART
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty        INT   NOT NULL DEFAULT 1,
  variant    JSONB DEFAULT '{}', -- free-form tag (grip/color) for products with no per-option stock
  variant_id UUID  REFERENCES product_variants(id) ON DELETE SET NULL, -- real variant (e.g. shoe size) with its own tracked stock
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id, variant, variant_id)
);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE TRIGGER cart_updated BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- WISHLIST
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   UUID  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_wishlist_user ON wishlists(user_id);

-- ─────────────────────────────────────────────────────────────────
-- COUPONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT  NOT NULL UNIQUE,
  type              TEXT  NOT NULL DEFAULT 'percent',  -- 'percent' | 'fixed'
  value             INT   NOT NULL,   -- percent (e.g. 10) or paise (e.g. 50000)
  min_order_value   INT   DEFAULT 0,  -- in paise
  usage_limit       INT,              -- null = unlimited
  usage_count       INT   DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- HOMEPAGE SECTIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_sections (
  id          UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT  NOT NULL,  -- 'hero', 'best_sellers', 'new_arrivals', 'editorial', 'banner'
  title       TEXT,
  subtitle    TEXT,
  body        TEXT,
  cta_text    TEXT,
  cta_url     TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT     DEFAULT 0,
  settings    JSONB   DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER homepage_updated BEFORE UPDATE ON homepage_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- FEATURED PRODUCTS (for homepage sections)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS featured_products (
  id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID  REFERENCES homepage_sections(id) ON DELETE CASCADE,
  product_id UUID  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT   DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- SITE SETTINGS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id               INT PRIMARY KEY DEFAULT 1,  -- singleton row
  company_name     TEXT DEFAULT 'RacquetIn',
  tagline          TEXT DEFAULT 'Precision equipment for players who care about the details.',
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  whatsapp         TEXT,
  instagram_url    TEXT,
  facebook_url     TEXT,
  twitter_url      TEXT,
  youtube_url      TEXT,
  shipping_policy  TEXT,
  return_policy    TEXT,
  privacy_policy   TEXT,
  terms            TEXT,
  meta_title       TEXT DEFAULT 'RacquetIn — Premium Badminton Equipment',
  meta_description TEXT DEFAULT 'Precision badminton equipment for players who demand more.',
  analytics_id     TEXT,  -- GA4 measurement ID
  meta_pixel_id    TEXT,
  primary_color    TEXT DEFAULT '#002B6B',
  secondary_color  TEXT DEFAULT '#0040a0',
  updated_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

-- ── Site content: freeform CMS copy (hero text, brand story, footer,
--    About page, etc.) — key/value so new sections don't need a migration.
CREATE TABLE IF NOT EXISTS site_content (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── FAQs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TRIGGER settings_updated BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER site_content_updated BEFORE UPDATE ON site_content FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER faqs_updated BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT  NOT NULL UNIQUE,
  is_active       BOOLEAN DEFAULT true,
  subscribed_at   TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

-- ─────────────────────────────────────────────────────────────────
-- STOCK MANAGEMENT
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - qty), updated_at = now()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Variant-aware version — deducts from a specific product_variants row
-- (e.g. one shoe size) instead of the parent product's own stock.
-- Used whenever an order line has a variant_id; decrement_stock above
-- still handles every line that doesn't (e.g. racquets).
CREATE OR REPLACE FUNCTION decrement_variant_stock(variant_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE product_variants
  SET stock = GREATEST(0, stock - qty)
  WHERE id = variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_stock(product_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock + qty, updated_at = now()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_slug_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_providers    ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Categories: public read, admin write ──────────────────────────
CREATE POLICY "categories_public_read"   ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "categories_admin_all"     ON categories FOR ALL    USING (is_admin_user());

-- ── Products: public read, admin write ───────────────────────────
CREATE POLICY "products_public_read"     ON products FOR SELECT USING (is_active = true);
CREATE POLICY "products_admin_all"       ON products FOR ALL    USING (is_admin_user());
CREATE POLICY "product_slug_history_public_read" ON product_slug_history FOR SELECT USING (true);
CREATE POLICY "product_slug_history_admin_write" ON product_slug_history FOR INSERT WITH CHECK (is_admin_user());

-- ── Product images: public read, admin write ─────────────────────
CREATE POLICY "product_images_public"    ON product_images FOR SELECT USING (true);
CREATE POLICY "product_images_admin"     ON product_images FOR ALL USING (is_admin_user());

-- ── Product variants: public read, admin write ───────────────────
CREATE POLICY "variants_public"          ON product_variants FOR SELECT USING (true);
CREATE POLICY "variants_admin"           ON product_variants FOR ALL USING (is_admin_user());

-- ── Customers: own record only ────────────────────────────────────
CREATE POLICY "customers_own"            ON customers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "customers_admin"          ON customers FOR ALL USING (is_admin_user());

-- ── Addresses: own only ───────────────────────────────────────────
CREATE POLICY "addresses_own"            ON customer_addresses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "addresses_admin"          ON customer_addresses FOR ALL USING (is_admin_user());

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Admin users: admin read only (super_admin manages) ───────────
CREATE POLICY "admin_users_read"         ON admin_users FOR SELECT USING (is_admin_user());
-- Was previously a raw `EXISTS (SELECT 1 FROM admin_users WHERE ...)` here —
-- since this policy is FOR ALL (which includes SELECT), and it queried
-- admin_users directly instead of through a SECURITY DEFINER function,
-- Postgres had to re-evaluate this same policy to satisfy that inner
-- query, over and over: "infinite recursion detected in policy for
-- relation admin_users". That's why a genuine super_admin row could
-- exist and still get a 403 — the SELECT itself was failing at the
-- database level, not a client-side bug. is_super_admin() above is
-- SECURITY DEFINER, so it bypasses RLS internally and breaks the loop.
CREATE POLICY "admin_users_super"        ON admin_users FOR ALL USING (is_super_admin());

-- ── Orders: own orders + admin ────────────────────────────────────
CREATE POLICY "orders_own"               ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "orders_insert_own"        ON orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_admin"             ON orders FOR ALL USING (is_admin_user());

CREATE POLICY "order_items_own"          ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "order_items_insert"       ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "order_items_admin"        ON order_items FOR ALL USING (is_admin_user());

-- ── Cart: own only ────────────────────────────────────────────────
CREATE POLICY "cart_own"                 ON cart_items FOR ALL USING (user_id = auth.uid());

-- ── Wishlist: own only ────────────────────────────────────────────
CREATE POLICY "wishlist_own"             ON wishlists FOR ALL USING (user_id = auth.uid());

-- ── Coupons: public read active, admin write ─────────────────────
CREATE POLICY "coupons_public_read"      ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "coupons_admin"            ON coupons FOR ALL USING (is_admin_user());

-- ── Homepage & settings: public read, admin write ────────────────
CREATE POLICY "homepage_public"          ON homepage_sections FOR SELECT USING (is_active = true);
CREATE POLICY "homepage_admin"           ON homepage_sections FOR ALL USING (is_admin_user());
CREATE POLICY "featured_public"          ON featured_products FOR SELECT USING (true);
CREATE POLICY "featured_admin"           ON featured_products FOR ALL USING (is_admin_user());
CREATE POLICY "settings_public"          ON site_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin"           ON site_settings FOR ALL USING (is_admin_user());

-- ── Site content & FAQs: public read, admin write ─────────────────
CREATE POLICY "site_content_public_read" ON site_content FOR SELECT USING (true);
CREATE POLICY "site_content_admin_write" ON site_content FOR ALL USING (is_admin_user());
CREATE POLICY "faqs_public_read"         ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "faqs_admin_write"         ON faqs FOR ALL USING (is_admin_user());

-- ── Payments: read-only for the client, by design ─────────────────
-- No INSERT/UPDATE/DELETE policy for anyone but the service role —
-- this is what makes "only Edge Functions write payments/orders"
-- enforceable at the database level, not just application convention.
-- payment_intents has NO client policies at all: a customer never
-- has a legitimate reason to read their own pending intent directly.
CREATE POLICY "payments_own_read"        ON payments FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "payments_admin_read"      ON payments FOR SELECT USING (is_admin_user());
CREATE POLICY "payment_events_admin_read" ON payment_events FOR SELECT USING (is_admin_user());
CREATE POLICY "shipments_own_read"       ON shipments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "shipments_admin_all"      ON shipments FOR ALL USING (is_admin_user());
CREATE POLICY "shipment_events_own_read" ON shipment_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shipments JOIN orders ON orders.id = shipments.order_id
    WHERE shipments.id = shipment_events.shipment_id AND orders.user_id = auth.uid()
  )
);
CREATE POLICY "shipment_events_admin_all" ON shipment_events FOR ALL USING (is_admin_user());
CREATE POLICY "delivery_providers_admin_all" ON delivery_providers FOR ALL USING (is_admin_user());

-- ── Newsletter: insert only for public, admin reads ──────────────
CREATE POLICY "newsletter_insert"        ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_admin"         ON newsletter_subscribers FOR ALL USING (is_admin_user());

-- ─────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_public_read"   ON storage.objects FOR SELECT USING (bucket_id IN ('product-images', 'site-assets'));
CREATE POLICY "storage_admin_write"   ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());
CREATE POLICY "storage_admin_update"  ON storage.objects FOR UPDATE USING (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());
CREATE POLICY "storage_admin_delete"  ON storage.objects FOR DELETE USING (bucket_id IN ('product-images', 'site-assets') AND is_admin_user());

-- ── Default CMS content keys ──────────────────────────────────────
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
  ('contact.faq_intro',          'Answers to the questions we hear most often.'),
  ('legal.privacy_policy',       ''),
  ('legal.terms_conditions',     '')
ON CONFLICT (key) DO NOTHING;

-- The two keys above are seeded empty here to keep this file readable —
-- their full text lives in supabase/migration_legal_content.sql. Run
-- that file (safe to re-run, upserts by key) to populate them with the
-- finalized Privacy Policy / Terms & Conditions content.

-- ═══════════════════════════════════════════════════════════════════
-- SCHEMA COMPLETE
-- ═══════════════════════════════════════════════════════════════════
