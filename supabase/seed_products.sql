-- ─────────────────────────────────────────────────────────────────
-- RacquetIn product seed — generated from src/data/products.js
-- Safe to re-run: upserts by slug.
-- Run in Supabase SQL editor AFTER schema.sql.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'arcsaber-7-tour', 'Arcsaber 7 Tour', 'Yonex', 'Arcsaber', 'ARC7T', 'rackets',
  14999, NULL, 22,
  'Advanced', 'All-Round', 'Even Balance', 'Medium', '83g (±2g)',
  'High Modulus Graphite + Tungsten', 'High Modulus Graphite', '28 lbs', 'BG66 Ultimax / BG80',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Even Balance","flex":"Medium","frame":"High Modulus Graphite + Tungsten","shaft":"High Modulus Graphite","maxTension":"28 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Isometric','Aero + Frame','Built-in T-Joint'],
  'The Arcsaber 7 Tour is built for all-round players who demand pinpoint precision and exceptional shuttle response. The slim frame profile reduces air resistance while Yonex''s Isometric head shape maximises the sweet spot. A favourite among doubles specialists who rely on consistent control from all areas of the court.', 'Pro Choice', ARRAY['Grayish Pearl'], ARRAY['arcsaber','all-round','even-balance','medium-flex','yonex','advanced'],
  4.8, 241,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/arcsaber-7-tour.webp', true, 0 FROM products WHERE slug = 'arcsaber-7-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-100-tour', 'Astrox 100 Tour', 'Yonex', 'Astrox', 'AX100T', 'rackets',
  17999, NULL, 18,
  'Advanced', 'Attacking', 'Head-Heavy', 'Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '30 lbs', 'BG80 Power / BG65Ti',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"30 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Aero + Frame'],
  'The Astrox 100 Tour is the choice of tour-level professionals demanding maximum rotational power without sacrificing control. Namd flexible graphite nanotechnology bonds graphite fibres at the nano level, creating a shaft that snaps back faster through impact. The head-heavy balance amplifies smash velocity — and the Astrox 100 Tour delivers it with uncommon precision.', 'Best Seller', ARRAY['Copper / Black'], ARRAY['astrox','attacking','head-heavy','stiff','yonex','advanced','smash'],
  4.9, 387,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-100-tour.webp', true, 0 FROM products WHERE slug = 'astrox-100-tour'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-100-tour-2.webp', false, 1 FROM products WHERE slug = 'astrox-100-tour'
ON CONFLICT DO NOTHING;
INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-100-tour-3.webp', false, 2 FROM products WHERE slug = 'astrox-100-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-77-tour', 'Astrox 77 Tour', 'Yonex', 'Astrox', 'AX77T', 'rackets',
  13999, NULL, 31,
  'Advanced', 'Attacking', 'Head-Heavy', 'Stiff', '83g (±2g)',
  'High Modulus Graphite + Namd', 'High Modulus Graphite + Namd', '30 lbs', 'BG80 Power / Aerosonic',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Stiff","frame":"High Modulus Graphite + Namd","shaft":"High Modulus Graphite + Namd","maxTension":"30 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric'],
  'The Astrox 77 Tour channels the powerful smash philosophy of the Astrox series into a slightly more accessible price point. Namd graphite in both the frame and shaft creates explosive snap-back energy at the point of contact. A serious attacking weapon for players who lead with the overhead game.', NULL, ARRAY['High Orange'], ARRAY['astrox','attacking','head-heavy','stiff','yonex','advanced'],
  4.7, 198,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-77-tour.webp', true, 0 FROM products WHERE slug = 'astrox-77-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nanoflare-1000-tour', 'Nanoflare 1000 Tour', 'Yonex', 'Nanoflare', 'NF1000T', 'rackets',
  16999, NULL, 24,
  'Advanced', 'Defensive', 'Head-Light', 'Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '30 lbs', 'NBG99 / BG66 Ultimax',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Light","flex":"Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"30 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Namd','Counter Balance Technology','Isometric','Aero + Frame'],
  'The Nanoflare 1000 Tour is designed for players who rely on speed above all else. The head-light balance produces an extraordinarily fast swing arc — ideal for rapid net exchanges, lightning drives, and defensive blocks that become attacks. Namd technology ensures the shaft flex remains precise and predictable under the demands of professional competition.', NULL, ARRAY['Lightning Yellow'], ARRAY['nanoflare','defensive','head-light','stiff','yonex','advanced','speed'],
  4.8, 162,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nanoflare-1000-tour.webp', true, 0 FROM products WHERE slug = 'nanoflare-1000-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-99f-tour', 'Astrox 99F Tour', 'Yonex', 'Astrox', 'AX99FT', 'rackets',
  19499, NULL, 14,
  'Professional', 'Attacking', 'Head-Heavy', 'Extra Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '32 lbs', 'BG80 Power / BG65Ti',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Extra Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"32 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Energy Boost Cap Plus'],
  'The Astrox 99F Tour is Yonex''s elite singles weapon — extra stiff, head-heavy, and engineered to translate maximum energy into the smash. The "F" designation indicates the slightly more compact frame for improved aerodynamics. Endorsed by top-tier singles professionals who demand a racket that can end a rally with a single overhead.', 'Pro Choice', ARRAY['White Tiger'], ARRAY['astrox','attacking','head-heavy','extra-stiff','yonex','professional','singles'],
  4.9, 143,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-99f-tour.webp', true, 0 FROM products WHERE slug = 'astrox-99f-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-88d-tour', 'Astrox 88D Tour', 'Yonex', 'Astrox', 'AX88DT', 'rackets',
  18499, NULL, 16,
  'Professional', 'Attacking', 'Head-Heavy', 'Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '32 lbs', 'BG80 Power / BG65Ti',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"32 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Built-in T-Joint Plus'],
  'The Astrox 88D Tour is the definitive doubles rear-court weapon. Designed in collaboration with professional men''s doubles players, it is optimised for drive and smash power from the back court. The "D" denotes drive — the 88D Tour is built to dominate the attacking rear-court role in doubles competition at the highest level.', 'Pro Choice', ARRAY['Dark Navy'], ARRAY['astrox','attacking','head-heavy','stiff','yonex','professional','doubles'],
  4.8, 176,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-88d-tour.webp', true, 0 FROM products WHERE slug = 'astrox-88d-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nanoflare-800f-tour', 'Nanoflare 800F Tour', 'Yonex', 'Nanoflare', 'NF800FT', 'rackets',
  15999, NULL, 19,
  'Advanced', 'Defensive', 'Head-Light', 'Stiff', '83g (±2g)',
  'High Modulus Graphite + Namd', 'High Modulus Graphite', '28 lbs', 'NBG99 / BG66 Ultimax',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Light","flex":"Stiff","frame":"High Modulus Graphite + Namd","shaft":"High Modulus Graphite","maxTension":"28 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Namd','Counter Balance Technology','Isometric'],
  'The Nanoflare 800F Tour refines the classic head-light Nanoflare formula with the "F" compact frame profile, reducing drag through the air while maintaining the exceptional swing speed that defines the series. Built for advanced players who rely on fast-twitch court coverage and lightning net play to dictate the tempo of a match.', NULL, ARRAY['Teal / Silver'], ARRAY['nanoflare','defensive','head-light','stiff','yonex','advanced','speed'],
  4.7, 112,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nanoflare-800f-tour.webp', true, 0 FROM products WHERE slug = 'nanoflare-800f-tour'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-100f-tour', 'Astrox 100F Tour', 'Yonex', 'Astrox', 'AX100FT', 'rackets',
  18999, NULL, 11,
  'Professional', 'Attacking', 'Head-Heavy', 'Extra Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '32 lbs', 'BG80 Power / BG65Ti',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Extra Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"32 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Aero + Frame'],
  'The Astrox 100F Tour pairs the aerodynamic F-frame profile with the full attacking power of the Astrox 100 lineage. Extra stiff shaft, head-heavy balance, and Namd flex-at-the-joint technology combine to produce a racket that punishes weak returns and rewards commitment to the smash. For players who play front foot, always attacking.', NULL, ARRAY['Flame Red / Black'], ARRAY['astrox','attacking','head-heavy','extra-stiff','yonex','professional'],
  4.8, 134,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'duora-z-strike', 'Duora Z-Strike', 'Yonex', 'Duora', 'DUORZS', 'rackets',
  22999, NULL, 8,
  'Professional', 'All-Round', 'Even Balance', 'Stiff', '83g (±2g)',
  'Torayca M40X Carbon', 'Torayca M40X Carbon', '35 lbs', 'Aerosonic / BG80',
  ARRAY['Racket','Full-cover case','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Even Balance","flex":"Stiff","frame":"Torayca M40X Carbon (Dual Frame)","shaft":"Torayca M40X Carbon","maxTension":"35 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Dual Optimum System','Rotational Generator System','Isometric','Aero + Box Frame'],
  'The Duora Z-Strike is the pinnacle of the Duora concept — a racket with two distinct hitting faces, each engineered for a specific shot type. The box-frame face generates power for smashes and drives; the aero-frame face cuts through the air for lightning speed on blocks and net shots. In Black/White colourway. A collector''s item as much as a performance tool.', 'Limited Edition', ARRAY['Black / White'], ARRAY['duora','all-round','even-balance','stiff','yonex','professional','limited'],
  4.9, 89,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/duora-z-strike.webp', true, 0 FROM products WHERE slug = 'duora-z-strike'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-99-pro', 'Astrox 99 Pro', 'Yonex', 'Astrox', 'AX99P', 'rackets',
  24999, NULL, 9,
  'Professional', 'Attacking', 'Head-Heavy', 'Extra Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '32 lbs', 'BG80 Power / BG65Ti',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Extra Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"32 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Energy Boost Cap Plus','Built-in T-Joint Plus'],
  'The Astrox 99 Pro is Yonex''s most advanced single-purpose attacking racket. Pro-level Namd graphite throughout — frame and shaft — means every gram of energy generated in the backswing transfers into the shuttle at contact. The Cherry Sunburst colourway is instantly recognisable. For tournament singles players who have refined the smash into a weapon.', 'Pro Choice', ARRAY['Cherry Sunburst'], ARRAY['astrox','attacking','head-heavy','extra-stiff','yonex','professional','singles'],
  4.9, 211,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-99-pro.webp', true, 0 FROM products WHERE slug = 'astrox-99-pro'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nanoflare-1000z', 'Nanoflare 1000Z', 'Yonex', 'Nanoflare', 'NF1000Z', 'rackets',
  27999, NULL, 6,
  'Professional', 'Defensive', 'Head-Light', 'Extra Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '33 lbs', 'Aerosonic / NBG99',
  ARRAY['Racket','Full-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Light","flex":"Extra Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"33 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Counter Balance Technology','Isometric','Aero + Frame','Energy Boost Cap Plus'],
  'The Nanoflare 1000Z is the fastest racket in the Yonex professional range. Counter Balance Technology pushes weight toward the grip end, while Namd graphite in the ultra-stiff shaft stores and releases energy with millisecond precision. In Laser Purple. The choice of world-class singles players who read the game a fraction ahead of everyone else.', 'Pro Choice', ARRAY['Laser Purple'], ARRAY['nanoflare','defensive','head-light','extra-stiff','yonex','professional','speed'],
  4.9, 97,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nanoflare-1000z.webp', true, 0 FROM products WHERE slug = 'nanoflare-1000z'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-100zz-va', 'Astrox 100ZZ (VA Edition)', 'Yonex', 'Astrox', 'AX100ZZVA', 'rackets',
  29999, NULL, 4,
  'Professional', 'Attacking', 'Head-Heavy', 'Extra Stiff', '83g (±2g)',
  'Torayca M40X Carbon + Namd', 'Torayca M40X Carbon', '32 lbs', 'BG80 Power',
  ARRAY['Racket','Full-cover case','Certificate of authenticity','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Extra Stiff","frame":"Torayca M40X Carbon + Namd","shaft":"Torayca M40X Carbon","maxTension":"32 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Professional"}'::jsonb, ARRAY['Namd','Rotational Generator System','Isometric','Energy Boost Cap Plus','Built-in T-Joint Plus'],
  'The Astrox 100ZZ in the Victor Axelsen signature edition. The world number one''s personal specification — extra stiff shaft, maximum head-heavy balance, and the Namd nano-level graphite bonding technology that defines the ZZ lineage. Limited production run in the VA colourway. The most complete attacking racket Yonex makes.', 'Limited Edition', ARRAY['Victor Axelsen Signature'], ARRAY['astrox','attacking','head-heavy','extra-stiff','yonex','professional','limited','victor-axelsen'],
  5, 64,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-100zz-va.webp', true, 0 FROM products WHERE slug = 'astrox-100zz-va'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-attack-9', 'Astrox Attack 9', 'Yonex', 'Astrox', 'AXA9', 'rackets',
  4999, 5999, 55,
  'Intermediate', 'Attacking', 'Head-Heavy', 'Medium-Stiff', '85g (±2g)',
  'Graphite + HM Graphite', 'HM Graphite', '28 lbs', 'BG65 / BG66 Force',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"85g (±2g)","balance":"Head-Heavy","flex":"Medium-Stiff","frame":"Graphite + HM Graphite","shaft":"HM Graphite","maxTension":"28 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Intermediate"}'::jsonb, ARRAY['Isometric'],
  'The Astrox Attack 9 brings the Astrox attacking philosophy to the intermediate level. Head-heavy balance and a medium-stiff shaft deliver genuine smash power without the unforgiving stiffness of tour-level frames. An ideal stepping stone for club players ready to develop an attacking game without sacrificing too much control.', NULL, ARRAY['Shine Red'], ARRAY['astrox','attacking','head-heavy','medium-stiff','yonex','intermediate'],
  4.3, 312,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-77-play', 'Astrox 77 Play', 'Yonex', 'Astrox', 'AX77PL', 'rackets',
  6999, NULL, 42,
  'Intermediate', 'Attacking', 'Head-Heavy', 'Medium', '85g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '26 lbs', 'BG65Ti / BG66 Force',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"85g (±2g)","balance":"Head-Heavy","flex":"Medium","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"26 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Intermediate"}'::jsonb, ARRAY['Isometric'],
  'The Astrox 77 Play inherits the 77 series'' attacking head-heavy balance and makes it accessible to developing players. The medium flex shaft provides a more forgiving response for players who are still refining their technique, while maintaining the feel and aesthetic language of the Tour-level models they may be working toward.', NULL, ARRAY['High Orange'], ARRAY['astrox','attacking','head-heavy','medium-flex','yonex','intermediate'],
  4.5, 278,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-77-play.webp', true, 0 FROM products WHERE slug = 'astrox-77-play'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nanoflare-700-play', 'Nanoflare 700 Play', 'Yonex', 'Nanoflare', 'NF700PL', 'rackets',
  5999, NULL, 68,
  'Intermediate', 'All-Round', 'Head-Light', 'Medium', '85g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '26 lbs', 'BG65 / NBG98',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"85g (±2g)","balance":"Head-Light","flex":"Medium","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"26 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Intermediate"}'::jsonb, ARRAY['Isometric','Counter Balance Technology'],
  'The Nanoflare 700 Play is the most popular intermediate racket in the current range. Its head-light balance rewards fast net play and aggressive drives without demanding the physical strength of heavier head setups. Forgiving, fast, and genuinely satisfying to swing — an excellent first step into performance equipment for developing club players.', 'Best Seller', ARRAY['Cyan / Black'], ARRAY['nanoflare','all-round','head-light','medium-flex','yonex','intermediate'],
  4.6, 445,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nanoflare-700-play.webp', true, 0 FROM products WHERE slug = 'nanoflare-700-play'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-99-play', 'Astrox 99 Play', 'Yonex', 'Astrox', 'AX99PL', 'rackets',
  8499, NULL, 35,
  'Intermediate', 'Attacking', 'Head-Heavy', 'Medium-Stiff', '85g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '28 lbs', 'BG80 / BG65Ti',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"85g (±2g)","balance":"Head-Heavy","flex":"Medium-Stiff","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"28 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Intermediate"}'::jsonb, ARRAY['Isometric','Rotational Generator System'],
  'The Astrox 99 Play delivers the distinctive Cherry Sunburst colourway and head-heavy attacking character of the professional 99 series at an intermediate price point. A meaningful performance upgrade for players who have outgrown their first racket and are ready to commit to an attacking playing style with a tool that rewards that commitment.', NULL, ARRAY['Cherry Sunburst'], ARRAY['astrox','attacking','head-heavy','medium-stiff','yonex','intermediate'],
  4.6, 189,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-99-play.webp', true, 0 FROM products WHERE slug = 'astrox-99-play'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-lite-27i', 'Astrox Lite 27i', 'Yonex', 'Astrox', 'AXL27I', 'rackets',
  2999, NULL, 90,
  'Beginner', 'All-Round', 'Even Balance', 'Flexible', '88g (±2g)',
  'Aluminum + Steel', 'Steel', '22 lbs', 'BG65 / Comes pre-strung',
  ARRAY['Racket (pre-strung)','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"88g (±2g)","balance":"Even Balance","flex":"Flexible","frame":"Aluminum + Steel","shaft":"Steel","maxTension":"22 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Beginner"}'::jsonb, ARRAY['Isometric'],
  'The Astrox Lite 27i is designed for players taking their first steps into badminton. Pre-strung and ready to play, the flexible shaft is forgiving on off-centre hits and the even balance makes it easy to control from all areas of the court. A comfortable introduction to the game without the cost or weight of a performance frame.', NULL, ARRAY['Shine Mint'], ARRAY['astrox','all-round','even-balance','flexible','yonex','beginner'],
  4.2, 521,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-88-play', 'Astrox 88 Play', 'Yonex', 'Astrox', 'AX88PL', 'rackets',
  7999, NULL, 38,
  'Intermediate', 'All-Round', 'Head-Heavy', 'Medium', '85g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '26 lbs', 'BG65Ti / BG66 Force',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"85g (±2g)","balance":"Head-Heavy","flex":"Medium","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"26 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Intermediate"}'::jsonb, ARRAY['Isometric'],
  'The Astrox 88 Play sits at the entry point of the 88 series — a racket range originally conceived to serve two distinct doubles roles. The Play version retains the solid head-heavy character while offering a forgiving medium flex shaft that suits developing players building confidence in an attacking doubles game.', NULL, ARRAY['Silver / Blue'], ARRAY['astrox','all-round','head-heavy','medium-flex','yonex','intermediate'],
  4.5, 167,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/astrox-88-play.webp', true, 0 FROM products WHERE slug = 'astrox-88-play'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'astrox-88d-game', 'Astrox 88D Game', 'Yonex', 'Astrox', 'AX88DG', 'rackets',
  9999, NULL, 27,
  'Advanced', 'Attacking', 'Head-Heavy', 'Stiff', '83g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '30 lbs', 'BG80 / BG65Ti',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Heavy","flex":"Stiff","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"30 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Isometric','Rotational Generator System'],
  'The Astrox 88D Game delivers the same dark navy colourway and attacking rear-court positioning as the Tour version at a price point accessible to club-level advanced players. Stiff shaft and head-heavy balance remain intact — only the material specification shifts slightly from the M40X Namd of the Tour. A serious racket for serious club players.', NULL, ARRAY['Dark Navy'], ARRAY['astrox','attacking','head-heavy','stiff','yonex','advanced','doubles'],
  4.6, 143,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nanoflare-1000-game', 'Nanoflare 1000 Game', 'Yonex', 'Nanoflare', 'NF1000G', 'rackets',
  10999, NULL, 33,
  'Advanced', 'Defensive', 'Head-Light', 'Stiff', '83g (±2g)',
  'High Modulus Graphite', 'High Modulus Graphite', '30 lbs', 'NBG99 / BG66 Ultimax',
  ARRAY['Racket','Half-cover','Warranty card'], '3 months manufacturer warranty', '{"weight":"83g (±2g)","balance":"Head-Light","flex":"Stiff","frame":"High Modulus Graphite","shaft":"High Modulus Graphite","maxTension":"30 lbs","length":"675mm","gripSize":"G4 / G5","skillLevel":"Advanced"}'::jsonb, ARRAY['Isometric','Counter Balance Technology'],
  'The Nanoflare 1000 Game brings the lightning head-light speed of the 1000 Tour into the advanced amateur category. Same Lightning Yellow colourway, same head-light balance point — the material step-down from Namd to High Modulus Graphite makes this a formidable racket for advanced club players who have developed a speed-based game.', NULL, ARRAY['Lightning Yellow'], ARRAY['nanoflare','defensive','head-light','stiff','yonex','advanced','speed'],
  4.6, 121,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, '/images/rackets/nanoflare-1000-game.webp', true, 0 FROM products WHERE slug = 'nanoflare-1000-game'
ON CONFLICT DO NOTHING;

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'courtdrive-pro', 'CourtDrive Pro', NULL, 'Drive Series', NULL, 'shoes',
  11999, NULL, 38,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Synthetic Mesh + TPU Overlays","sole":"Non-marking Gum Rubber","midsole":"Dual-density EVA Foam","closure":"Lace-up","courtType":"Indoor / All-court","cushioning":"High","support":"Ankle Support Wing","weight":"310g (UK 9)"}'::jsonb, '{}',
  'Professional-level court shoe engineered for explosive lateral movement. Dual-density midsole cushions high-impact landings. Non-marking gum rubber outsole.', 'Best Seller', ARRAY['White/Red','Black/Red'], ARRAY['indoor','professional','lateral-support'],
  4.8, 224,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'aerostep-elite', 'AeroStep Elite', NULL, 'Aero Series', NULL, 'shoes',
  9999, 11999, 22,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Knit Mesh + Carbon Fibre Shank","sole":"Non-marking Rubber","midsole":"Responsive Foam Cell","closure":"Lace-up","courtType":"Indoor","cushioning":"Medium","support":"Low-profile","weight":"275g (UK 9)"}'::jsonb, '{}',
  'Featherweight speed-focused shoe with a carbon fibre shank. Breathable knit upper for long-session comfort. Built for singles players who live on their feet.', 'Lightweight', ARRAY['Blue/White','White/Navy'], ARRAY['indoor','lightweight','speed'],
  4.6, 156,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'gripcourt-max', 'GripCourt Max', NULL, 'Court Series', NULL, 'shoes',
  8499, NULL, 44,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Synthetic Leather + Mesh","sole":"High-grip Gum Rubber","midsole":"Stability EVA","closure":"Lace-up","courtType":"Indoor / Hard Court","cushioning":"High","support":"Medial Support Bar","weight":"335g (UK 9)"}'::jsonb, '{}',
  'Maximum grip and medial stability for doubles players. Wide toe box reduces fatigue. Reinforced heel cup for confident split-step landings.', NULL, ARRAY['White/Black','Navy'], ARRAY['indoor','grip','stability','doubles'],
  4.5, 98,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'feathercourt-lite', 'FeatherCourt Lite', NULL, 'Lite Series', NULL, 'shoes',
  7499, NULL, 30,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Lightweight Mesh + PU Overlays","sole":"Non-marking Rubber","midsole":"Lightweight EVA","closure":"Lace-up","courtType":"Indoor","cushioning":"Medium","support":"Low-profile","weight":"240g (UK 5)"}'::jsonb, '{}',
  'Women''s specific last with a narrower heel, wider forefoot, and lower arch. Ultralight 240g construction. Perfect for club players seeking comfort over long sessions.', 'New', ARRAY['White','Pearl Pink'], ARRAY['indoor','lightweight','women'],
  4.4, 52,
  false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'velocity-court-x', 'Velocity Court X', NULL, 'Velocity Series', NULL, 'shoes',
  10999, NULL, 19,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Performance Mesh + Carbon Fibre","sole":"Carbon-infused Rubber","midsole":"Carbon Plate + React Foam","closure":"Lace-up + BOA","courtType":"Indoor","cushioning":"Low","support":"Carbon Arch Plate","weight":"260g (UK 9)"}'::jsonb, '{}',
  'Professional-grade speed shoe used by RacquetIn-sponsored athletes. Extra-stiff carbon plate propels every step. Aggressive outsole pattern for maximum grip.', 'Pro Series', ARRAY['Black/Gold','White/Silver'], ARRAY['indoor','pro','speed','carbon'],
  4.7, 74,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'aerosprint-2', 'AeroSprint 2', NULL, 'Aero Series', NULL, 'shoes',
  8999, 9999, 26,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"upper":"Ventilated Mesh + Synthetic Overlays","sole":"Multi-directional Rubber","midsole":"Rebound EVA","closure":"Lace-up","courtType":"Indoor / All-court","cushioning":"Medium-High","support":"Dynamic Heel Counter","weight":"285g (UK 9)"}'::jsonb, '{}',
  'Second-generation AeroSprint with improved lateral support and updated outsole pattern. Breathable upper now features anti-odour lining for extended sessions.', NULL, ARRAY['Orange/Black','Blue/White'], ARRAY['indoor','all-court','speed'],
  4.5, 88,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'tour-9-bag', 'Tour 9-Racket Bag', NULL, 'Tour Series', NULL, 'bags',
  10999, NULL, 19,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"capacity":"9 Rackets","compartments":"3 Main + 1 Shoe","material":"Polyester 600D + PU Coating","dimensions":"76 × 34 × 30cm","weight":"1.2kg","features":"Thermal lining, padded strap, shoe compartment"}'::jsonb, '{}',
  'Professional tour bag with thermal-lined racket compartment protecting strings from temperature extremes. Separate shoe compartment, padded laptop sleeve, and embossed logo tag.', 'New', ARRAY['Black/Red','Navy/White'], ARRAY['tour','large','professional'],
  4.7, 88,
  false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'performance-backpack', 'Performance Backpack', NULL, 'Performance Series', NULL, 'bags',
  6499, NULL, 33,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"capacity":"2 Rackets + 25L","compartments":"2 Main + 1 Front","material":"Ripstop Nylon","dimensions":"48 × 30 × 18cm","weight":"0.7kg","features":"USB port, wet pocket, laptop sleeve"}'::jsonb, '{}',
  'Sleek everyday backpack holding 2 rackets plus full kit. Ergonomic air-mesh back padding, dedicated wet pocket, hidden USB charging port.', NULL, ARRAY['Black','Navy','Red'], ARRAY['backpack','medium','everyday'],
  4.5, 112,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'court-duffel', 'Court Duffel', NULL, 'Court Series', NULL, 'bags',
  4999, NULL, 28,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"capacity":"2 Rackets + 20L","compartments":"1 Main + 2 Side","material":"Polyester 420D","dimensions":"55 × 28 × 26cm","weight":"0.5kg","features":"Water-resistant base, ventilated pocket"}'::jsonb, '{}',
  'Compact duffel for 1–2 rackets, kit, and accessories. Water-resistant base, ventilated side pocket. Perfect for club sessions.', NULL, ARRAY['Black','Grey/Red'], ARRAY['duffel','small','club'],
  4.4, 67,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'match-day-sling', 'Match Day Sling', NULL, 'Court Series', NULL, 'bags',
  3799, NULL, 36,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"capacity":"1 Racket + Essentials","compartments":"1 Main + 1 Front","material":"Neoprene + Nylon","dimensions":"72 × 22 × 8cm","weight":"0.3kg","features":"Padded strap, shuttle tube pocket"}'::jsonb, '{}',
  'Single-racket sling bag for match day essentials. Slim profile, padded racket pocket, zippered front pouch for shuttle tubes.', NULL, ARRAY['Black','White'], ARRAY['sling','small','compact'],
  4.3, 43,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'elite-tournament-bag', 'Elite Tournament Bag', NULL, 'Elite Series', NULL, 'bags',
  14999, NULL, 11,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"capacity":"12 Rackets + Full Kit","compartments":"4 Main + 2 Accessory","material":"Premium Polyester 900D + Leather Handles","dimensions":"84 × 38 × 34cm","weight":"1.6kg","features":"Thermal lining, trolley sleeve, padded backpack straps"}'::jsonb, '{}',
  'Full tournament kit bag used by RacquetIn-sponsored professionals. Holds 12 rackets, full shoe compartment, padded laptop and tablet sleeves. Trolley-compatible.', 'Pro Series', ARRAY['Jet Black'], ARRAY['tour','large','professional','tournament'],
  4.9, 32,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'tournament-feather', 'Tournament Feather Pro', NULL, 'Tournament Series', NULL, 'shuttlecocks',
  2999, NULL, 120,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Goose Feather","feathers":"16 Premium Goose Feathers","cork":"Natural Single Cork","speedRange":"75–78","packSize":"12 per tube","grade":"BWF Approved"}'::jsonb, '{}',
  'BWF-approved 16-goose-feather shuttlecock. Consistent arc, stable flight, superior durability. The choice of RacquetIn-sponsored tournaments.', 'Tournament', ARRAY['White'], ARRAY['feather','tournament','professional'],
  4.9, 445,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'championship-feather-77', 'Championship Feather 77', NULL, 'Championship Series', NULL, 'shuttlecocks',
  2499, NULL, 90,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Goose Feather","feathers":"16 Goose Feathers","cork":"Natural Cork","speedRange":"77","packSize":"12 per tube","grade":"Championship"}'::jsonb, '{}',
  'Pre-selected speed 77 championship shuttlecock for consistent play across a wide temperature range. Ideal for indoor sports hall environments.', 'Tournament', ARRAY['White'], ARRAY['feather','championship','indoor'],
  4.8, 287,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'training-feather', 'Training Feather', NULL, 'Training Series', NULL, 'shuttlecocks',
  1999, NULL, 200,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Duck Feather","feathers":"16 Duck Feathers","cork":"Composite Cork","speedRange":"76–77","packSize":"12 per tube","grade":"Training"}'::jsonb, '{}',
  'Durable duck-feather training shuttle. Maintains consistent flight characteristics over more impacts than tournament shuttles. Great value for high-volume sessions.', 'Training', ARRAY['White'], ARRAY['feather','training','value'],
  4.6, 312,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'club-practice-pack', 'Club Practice Pack', NULL, 'Club Series', NULL, 'shuttlecocks',
  1599, 1999, 250,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Synthetic Feather Hybrid","feathers":"16 Synthetic Feathers","cork":"Synthetic Cork","speedRange":"76–77","packSize":"12 per tube","grade":"Club"}'::jsonb, '{}',
  'Economy pack for club and recreational use. Synthetic-feather hybrid construction delivers surprising consistency at an accessible price point.', NULL, ARRAY['White'], ARRAY['feather','club','value','recreational'],
  4.3, 198,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nylon-speed-77', 'Nylon Speed 77', NULL, 'Nylon Series', NULL, 'shuttlecocks',
  1099, NULL, 300,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Nylon","feathers":"Nylon Skirt","cork":"Synthetic Cork","speedRange":"77","packSize":"6 per tube","grade":"Recreational"}'::jsonb, '{}',
  'Durable nylon shuttle for outdoor and recreational play. All-weather performance. Ideal for beginners and training at pace.', NULL, ARRAY['White'], ARRAY['nylon','recreational','outdoor'],
  4.3, 188,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'nylon-speed-78', 'Nylon Speed 78', NULL, 'Nylon Series', NULL, 'shuttlecocks',
  1099, NULL, 280,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"type":"Nylon","feathers":"Nylon Skirt","cork":"Synthetic Cork","speedRange":"78","packSize":"6 per tube","grade":"Recreational"}'::jsonb, '{}',
  'Faster speed 78 nylon shuttle for cooler environments or higher-altitude courts. Same durable nylon skirt construction as the Speed 77.', NULL, ARRAY['White'], ARRAY['nylon','recreational','fast'],
  4.2, 143,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'precision-66', 'Precision 66', NULL, 'Precision Series', NULL, 'strings',
  1299, NULL, 500,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Multifilament Nylon","gauge":"0.66mm","length":"10m (pre-cut)","recommendedTension":"26–30lbs","feature":"Maximum repulsion, crisp feel"}'::jsonb, '{}',
  'Ultra-thin 0.66mm high-repulsion string. Maximum power transfer at high tensions. Preferred by professional attacking players. 10m pre-cut reel.', 'Best Seller', ARRAY['White','Yellow'], ARRAY['strings','professional','repulsion'],
  4.8, 321,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'power-strike-68', 'Power Strike 68', NULL, 'Power Series', NULL, 'strings',
  1199, NULL, 400,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Multifilament Nylon","gauge":"0.68mm","length":"10m (pre-cut)","recommendedTension":"24–28lbs","feature":"Power + durability balance"}'::jsonb, '{}',
  'Slightly thicker 0.68mm string balancing power and control. More durable than 0.66mm for players who break strings frequently. 10m pre-cut reel.', NULL, ARRAY['White'], ARRAY['strings','power','durable'],
  4.7, 198,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'control-pro-65', 'Control Pro 65', NULL, 'Control Series', NULL, 'strings',
  1399, NULL, 350,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Braided Multifilament","gauge":"0.65mm","length":"10m (pre-cut)","recommendedTension":"24–28lbs","feature":"Feedback + tension retention"}'::jsonb, '{}',
  'Premium 0.65mm control-oriented string with enhanced feel feedback. Braided construction gives more consistent tension retention over time.', 'Pro Series', ARRAY['White','Natural'], ARRAY['strings','control','professional'],
  4.7, 145,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'titanium-hybrid-70', 'Titanium Hybrid 70', NULL, 'Hybrid Series', NULL, 'strings',
  1499, NULL, 300,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Titanium-infused Nylon","gauge":"0.70mm","length":"10m (pre-cut)","recommendedTension":"26–32lbs","feature":"Titanium durability, high tension stability"}'::jsonb, '{}',
  'Titanium-infused 0.70mm hybrid string. Exceptional durability for heavy smashers and players who break strings at high tensions. 10m pre-cut reel.', NULL, ARRAY['White','Grey'], ARRAY['strings','durable','titanium'],
  4.6, 87,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'red-grip', 'Red Performance Grip', NULL, 'ProGrip Series', NULL, 'grips',
  749, NULL, 500,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Polyurethane","thickness":"0.6mm","length":"1100mm","packSize":"3 per pack","feature":"Anti-slip, moisture-wicking"}'::jsonb, '{}',
  'Anti-slip PU overgrip. Moisture-wicking surface with a premium tactile feel. 0.6mm thin — adds minimal bulk while transforming grip feel. Pack of 3.', NULL, ARRAY['Crimson Red','Black','White','Navy'], ARRAY['grip','overgrip','accessories'],
  4.8, 534,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'carbon-black-grip', 'Carbon Black Grip', NULL, 'ProGrip Series', NULL, 'grips',
  899, NULL, 400,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Perforated Polyurethane","thickness":"0.65mm","length":"1100mm","packSize":"3 per pack","feature":"Perforated, moisture management"}'::jsonb, '{}',
  'Micro-perforated carbon-pattern PU overgrip. Excellent moisture management for high-intensity play. Unique texture provides enhanced feel feedback.', NULL, ARRAY['Carbon Black'], ARRAY['grip','overgrip','perforated'],
  4.7, 212,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'elite-dry-grip', 'Elite Dry Grip', NULL, 'Elite Series', NULL, 'grips',
  999, NULL, 350,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Towelling + Tacky PU Hybrid","thickness":"0.7mm","length":"1100mm","packSize":"3 per pack","feature":"Tacky dry feel, pro-grade"}'::jsonb, '{}',
  'Dry-feel tacky grip used by professional players. Superior moisture absorption with a matte non-shiny surface. Slightly tacky for confident grip retention during power strokes.', 'Pro Series', ARRAY['White','Black'], ARRAY['grip','overgrip','professional','tacky'],
  4.9, 143,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'cushion-comfort-grip', 'Cushion Comfort Grip', NULL, 'Comfort Series', NULL, 'grips',
  699, NULL, 400,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Foam-core PU","thickness":"0.9mm","length":"1100mm","packSize":"3 per pack","feature":"Vibration dampening, comfort"}'::jsonb, '{}',
  'Thick 0.9mm cushioned overgrip for players seeking maximum vibration dampening and comfort. Ideal for seniors or players with arm or elbow sensitivity.', NULL, ARRAY['White','Blue','Pink'], ARRAY['grip','overgrip','comfort','cushion'],
  4.5, 178,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'tournament-towel-grip', 'Tournament Towel Grip', NULL, 'Tournament Series', NULL, 'grips',
  949, NULL, 300,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"100% Cotton Towelling","thickness":"1.5mm","length":"1100mm","packSize":"3 per pack","feature":"Maximum absorption, classic feel"}'::jsonb, '{}',
  'Traditional towelling grip for players who prefer a classic dry-feel texture. Highest moisture absorption available. Used on tour for decades.', 'Tournament', ARRAY['White'], ARRAY['grip','towel','traditional','tournament'],
  4.7, 98,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'wristband-pair', 'Competition Wristband', NULL, 'Apparel', NULL, 'apparel',
  899, NULL, 200,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"80% Cotton, 20% Elastane","size":"One size","packSize":"2 per pack","feature":"High absorption, competition grade"}'::jsonb, '{}',
  'Terry-cotton competition wristband pair. High sweat absorption, thick 3cm profile. Keeps hands dry during intense rallies.', NULL, ARRAY['White','Black','Crimson Red'], ARRAY['wristband','apparel'],
  4.5, 145,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'headband', 'Performance Headband', NULL, 'Apparel', NULL, 'apparel',
  699, NULL, 200,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Terry Cotton + Silicone Lining","size":"One size","packSize":"1 per pack","feature":"Non-slip, absorbent"}'::jsonb, '{}',
  'Non-slip silicone-lined headband. Stays in position during explosive movement. Stretchy terry construction absorbs sweat effectively.', NULL, ARRAY['White','Black','Crimson Red','Navy'], ARRAY['headband','apparel'],
  4.4, 98,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'dampener-pack', 'Vibration Dampener Pack', NULL, 'Apparel', NULL, 'apparel',
  449, NULL, 600,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Medical-grade Silicone","packSize":"4 per pack","compatibility":"All rackets","feature":"Vibration reduction"}'::jsonb, '{}',
  'Silicone cross-string dampeners. Reduces harsh string vibration and frame shock. Easy to install — clips between main strings without affecting tension.', NULL, ARRAY['Black','Red','White'], ARRAY['dampener','apparel'],
  4.6, 198,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'grip-tape', 'Grip Finishing Tape', NULL, 'Apparel', NULL, 'apparel',
  349, NULL, 500,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"PVC Self-adhesive","width":"18mm","packSize":"8 strips","feature":"Secure, clean finish"}'::jsonb, '{}',
  'Self-adhesive finishing tape to seal overgrip ends cleanly. Prevents unravelling during play. Pack of 8 strips.', NULL, ARRAY['Black','White','Red'], ARRAY['grip','tape','apparel'],
  4.4, 112,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'shoe-bag', 'Shoe Bag', NULL, 'Apparel', NULL, 'apparel',
  1099, NULL, 150,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Nylon Mesh","dimensions":"36 × 28cm","packSize":"1 bag","feature":"Ventilated, drawstring closure"}'::jsonb, '{}',
  'Ventilated drawstring shoe bag. Mesh construction allows shoes to breathe post-match. Fits up to UK size 13.', NULL, ARRAY['Black','Navy'], ARRAY['shoe bag','apparel'],
  4.3, 67,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'stringing-awl', 'Stringing Awl', NULL, 'Tools', NULL, 'apparel',
  749, NULL, 80,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Hardened Steel + Rubber Handle","length":"16cm","packSize":"1 tool","feature":"Professional stringing aid"}'::jsonb, '{}',
  'Professional pointed awl for threading string through grommet holes. Hardened steel tip with ergonomic rubber handle.', NULL, ARRAY['Silver/Black'], ARRAY['tools','stringing','apparel'],
  4.6, 43,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'premium-towel', 'Court Towel', NULL, 'Apparel', NULL, 'apparel',
  1699, NULL, 100,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Microfibre","dimensions":"110 × 50cm","packSize":"1 towel","feature":"Quick-dry, compact"}'::jsonb, '{}',
  'Quick-dry microfibre court towel. Twice as absorbent as standard cotton. Compact fold, lightweight carry. Embossed RacquetIn logo.', NULL, ARRAY['White','Black'], ARRAY['towel','apparel'],
  4.5, 56,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'water-bottle', 'Performance Water Bottle', NULL, 'Apparel', NULL, 'apparel',
  1599, NULL, 120,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Stainless Steel 18/8","capacity":"750ml","insulation":"12h cold / 6h hot","feature":"Leak-proof flip-top, BPA-free"}'::jsonb, '{}',
  'Double-wall insulated 750ml bottle keeps drinks cold for 12 hours. Leak-proof flip-top lid. BPA-free food-grade stainless steel.', NULL, ARRAY['Graphite Black','White'], ARRAY['bottle','apparel','hydration'],
  4.6, 88,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'overgrip-pack', 'Overgrip Pack 12', NULL, 'ProGrip Series', NULL, 'apparel',
  1999, 2399, 300,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Polyurethane","thickness":"0.6mm","length":"1100mm","packSize":"12 per pack","feature":"Bulk value pack"}'::jsonb, '{}',
  'Economy 12-pack of our Red Performance Grip overgrip. Same quality as the 3-pack at a better cost-per-grip. Ideal for clubs or frequent grip changers.', NULL, ARRAY['White','Black','Mixed'], ARRAY['grip','overgrip','value','bulk'],
  4.8, 234,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'court-socks', 'Court Socks Pro', NULL, 'Apparel', NULL, 'apparel',
  1099, NULL, 150,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"78% Cotton, 18% Polyester, 4% Elastane","size":"S/M/L","packSize":"2 pairs","feature":"Heel/toe cushioning, arch compression"}'::jsonb, '{}',
  'Performance badminton socks with extra heel and toe cushioning. Anti-blister Y-shaped heel cup. Arch compression for support during lateral movement.', NULL, ARRAY['White','Black'], ARRAY['socks','apparel'],
  4.5, 76,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'performance-jersey', 'Performance Jersey', NULL, 'Performance Series', NULL, 'apparel',
  2999, NULL, 80,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"100% Recycled Polyester Mesh","fit":"Athletic Fit","technology":"Moisture-wicking, quick-dry","care":"Machine wash cold","weight":"140 gsm","feature":"Ventilated side panels"}'::jsonb, '{}',
  'Lightweight moisture-wicking match jersey. Mesh side panels for ventilation during high-intensity rallies. Quick-dry fabric keeps you cool through five-set matches.', 'Best Seller', ARRAY['White','Crimson Red','Navy'], ARRAY['clothing','jersey','match','apparel'],
  4.7, 156,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'match-polo', 'Match Polo', NULL, 'Tournament Series', NULL, 'apparel',
  2799, NULL, 65,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"92% Polyester, 8% Elastane","fit":"Regular Fit","technology":"Anti-odour, 4-way stretch","care":"Machine wash cold","weight":"160 gsm","feature":"Collared, stretch-woven"}'::jsonb, '{}',
  'Classic collared polo for tournament play. Stretch-woven fabric moves with you through every lunge and smash. Anti-odour treatment for all-day freshness.', NULL, ARRAY['White','Black','Sky Blue'], ARRAY['clothing','polo','tournament','apparel'],
  4.6, 98,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'training-tshirt', 'Training T-Shirt', NULL, 'Training Series', NULL, 'apparel',
  1499, 1799, 120,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"60% Cotton, 40% Polyester","fit":"Regular Fit","technology":"Breathable blend","care":"Machine wash cold","weight":"180 gsm","feature":"Reinforced shoulder seams"}'::jsonb, '{}',
  'Everyday training tee in soft breathable cotton-blend. Reinforced shoulder seams withstand repetitive overhead motion. Club and practice essential.', NULL, ARRAY['White','Black','Grey Melange','Crimson Red'], ARRAY['clothing','tshirt','training','apparel'],
  4.5, 212,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'tournament-shorts', 'Tournament Shorts', NULL, 'Tournament Series', NULL, 'apparel',
  1899, NULL, 90,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"88% Polyester, 12% Elastane","fit":"Athletic Fit","technology":"4-way stretch, mesh ventilation","care":"Machine wash cold","weight":"150 gsm","feature":"Zip security pocket"}'::jsonb, '{}',
  'Built for explosive lateral movement. Elasticated waistband with internal drawcord, side mesh ventilation panels, zip security pocket for match essentials.', NULL, ARRAY['White','Black','Navy'], ARRAY['clothing','shorts','tournament','apparel'],
  4.6, 134,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'performance-track-pants', 'Performance Track Pants', NULL, 'Performance Series', NULL, 'apparel',
  2499, NULL, 55,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"90% Polyester, 10% Elastane","fit":"Tapered Fit","technology":"Lightweight, quick-dry","care":"Machine wash cold","weight":"170 gsm","feature":"Zip ankle cuffs, side pockets"}'::jsonb, '{}',
  'Tapered warm-up and travel pants with a tailored athletic silhouette. Zip ankle cuffs for easy on/off over court shoes. Lightweight enough for pre-match warm-up.', 'New', ARRAY['Black','Navy'], ARRAY['clothing','pants','training','apparel'],
  4.5, 67,
  false, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'warm-up-jacket', 'Warm-Up Jacket', NULL, 'Performance Series', NULL, 'apparel',
  3499, NULL, 40,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"100% Polyester Stretch-Woven","fit":"Athletic Fit","technology":"Wind-resistant shell","care":"Machine wash cold","weight":"220 gsm","feature":"Full-zip, stand collar"}'::jsonb, '{}',
  'Full-zip warm-up jacket for pre-match preparation and travel. Stand collar blocks draughts courtside. Stretch-woven shell layers easily over match kit.', NULL, ARRAY['Black','Crimson Red/Black'], ARRAY['clothing','jacket','warmup','apparel'],
  4.7, 89,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'performance-hoodie', 'Performance Hoodie', NULL, 'Performance Series', NULL, 'apparel',
  3199, NULL, 70,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"80% Cotton, 20% Polyester Fleece","fit":"Relaxed Fit","technology":"Brushed-back fleece","care":"Machine wash cold","weight":"280 gsm","feature":"Kangaroo pocket, drawcord hood"}'::jsonb, '{}',
  'Off-court comfort meets on-brand style. Brushed-back fleece interior, kangaroo pocket, adjustable drawcord hood. The most-worn piece in the RacquetIn range.', 'Best Seller', ARRAY['Black','Grey Melange','Navy'], ARRAY['clothing','hoodie','casual','apparel'],
  4.8, 178,
  true, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'compression-sleeve', 'Compression Sleeve', NULL, 'Performance Series', NULL, 'apparel',
  999, NULL, 150,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"75% Nylon, 25% Spandex","fit":"Compression Fit","technology":"Graduated compression","care":"Hand wash recommended","weight":"—","feature":"Single sleeve, reduces fatigue"}'::jsonb, '{}',
  'Graduated compression arm sleeve supports forearm muscles during repetitive smash motion. Reduces fatigue and muscle vibration through extended matches.', NULL, ARRAY['Black','White'], ARRAY['clothing','sleeve','compression','apparel'],
  4.4, 76,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'performance-cap', 'Performance Cap', NULL, 'Headwear', NULL, 'apparel',
  1299, NULL, 100,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Polyester Twill + Mesh Back","fit":"Adjustable","technology":"Moisture-wicking sweatband","care":"Spot clean","weight":"—","feature":"Curved brim, mesh back panel"}'::jsonb, '{}',
  'Curved-brim cap with moisture-wicking sweatband. Rear adjustable strap fits all head sizes. Lightweight mesh back panel for breathability during play.', NULL, ARRAY['White','Black','Crimson Red'], ARRAY['clothing','cap','headwear','apparel'],
  4.5, 102,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  'tournament-visor', 'Tournament Visor', NULL, 'Tournament Series', NULL, 'apparel',
  1099, NULL, 90,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  '{}', NULL, '{"material":"Polyester Twill + Terry Sweatband","fit":"Adjustable","technology":"Terry sweatband","care":"Spot clean","weight":"—","feature":"Open-top, lightweight"}'::jsonb, '{}',
  'Open-top visor for players who prefer airflow over full cap coverage. Terry sweatband absorbs moisture. Lightweight design stays put through fast direction changes.', NULL, ARRAY['White','Black'], ARRAY['clothing','visor','headwear','apparel'],
  4.3, 54,
  false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

