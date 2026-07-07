// Generates supabase/seed_products.sql from src/data/products.js
// Run with: node scripts/gen-seed.mjs
import { products } from '../src/data/products.js';
import { writeFileSync } from 'fs';

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function escArr(arr) {
  if (!arr || !arr.length) return "'{}'";
  return `ARRAY[${arr.map(esc).join(',')}]`;
}
function num(v) {
  return v === null || v === undefined ? 'NULL' : Number(v);
}

let sql = `-- ─────────────────────────────────────────────────────────────────
-- RacquetIn product seed — generated from src/data/products.js
-- Safe to re-run: upserts by slug.
-- Run in Supabase SQL editor AFTER schema.sql.
-- ─────────────────────────────────────────────────────────────────

`;

for (const p of products) {
  const specsJson = JSON.stringify(p.specs || {}).replace(/'/g, "''");
  sql += `INSERT INTO products (
  slug, name, brand, series, series_code, category_slug, price, original_price, stock,
  player_level, playing_style, balance, flex, weight_spec, frame_material, shaft_material,
  max_tension, recommended_string, in_box, warranty, specs, technologies, description, badge,
  colors, tags, rating, review_count, is_best_seller, is_new_arrival
) VALUES (
  ${esc(p.id)}, ${esc(p.name)}, ${esc(p.brand)}, ${esc(p.series)}, ${esc(p.seriesCode)}, ${esc(p.category)},
  ${num(p.price)}, ${num(p.originalPrice)}, ${num(p.stock) === 'NULL' ? 0 : num(p.stock)},
  ${esc(p.playerLevel)}, ${esc(p.playingStyle)}, ${esc(p.balance)}, ${esc(p.flex)}, ${esc(p.weight)},
  ${esc(p.frameMaterial)}, ${esc(p.shaftMaterial)}, ${esc(p.maxTension)}, ${esc(p.recommendedString)},
  ${escArr(p.inBox)}, ${esc(p.warranty)}, '${specsJson}'::jsonb, ${escArr(p.technologies)},
  ${esc(p.description)}, ${esc(p.badge)}, ${escArr(p.colors)}, ${escArr(p.tags)},
  ${num(p.rating) === 'NULL' ? 0 : num(p.rating)}, ${num(p.reviews) === 'NULL' ? 0 : num(p.reviews)},
  ${p.badge === 'Best Seller' ? 'true' : 'false'}, ${p.badge === 'New' ? 'true' : 'false'}
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock,
  description = EXCLUDED.description, updated_at = now();

`;
  if (p.images && p.images.length) {
    p.images.forEach((img, i) => {
      sql += `INSERT INTO product_images (product_id, url, is_primary, sort_order)
SELECT id, ${esc(img)}, ${i === 0 ? 'true' : 'false'}, ${i} FROM products WHERE slug = ${esc(p.id)}
ON CONFLICT DO NOTHING;
`;
    });
    sql += '\n';
  }
}

writeFileSync(new URL('../supabase/seed_products.sql', import.meta.url), sql);
console.log(`Wrote seed for ${products.length} products.`);
