// ── Product normalizer ──────────────────────────────────────────────
// Every page (Collection, Product Detail, Home, Search, Wishlist,
// Cart) renders products through this shape. Supabase rows come back
// snake_case (per supabase/schema.sql); local data/products.js
// objects are already camelCase — this function makes both look
// identical to the rest of the app so no UI code has to care which
// source the data came from.
//
// Known gap (see racketin-launch-audit.md / migration notes): the
// `products` table has no columns for `gripSizes` or `sizes` (used by
// racket grip and shoe/apparel size selectors on the Product Detail
// page). Those variant options exist only in local data/products.js
// today. Supabase-sourced products will simply omit that selector —
// ProductDetailPage already guards both with `{product.gripSizes && ...}`
// / `{product.sizes && ...}`, so this doesn't crash, it just means
// that specific UI won't appear until the schema grows those columns.

function isLocalShape(p) {
  // Every Supabase `products` row always has a `slug` column, even
  // without the images/categories join. Local data/products.js
  // objects never have one — that's the reliable tell.
  return p && p.slug === undefined;
}

export function normalizeProduct(p) {
  if (!p) return null;

  // Local mock data is already in the shape every component expects — pass through untouched.
  if (isLocalShape(p)) return p;

  // Otherwise treat it as a Supabase `products` row (optionally joined with product_images/categories).
  const images = [...(p.product_images || [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || ((b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)))
    .map(img => img.url)
    .filter(Boolean);

  return {
    id: p.slug || p.id,     // routes + cart + wishlist everywhere else treat "id" as the slug
    dbId: p.id,              // real UUID, kept in case a caller needs it
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    series: p.series,
    seriesCode: p.series_code,
    category: p.category_slug || p.categories?.slug,
    price: p.price,
    originalPrice: p.original_price,
    stock: p.stock ?? 0,
    playerLevel: p.player_level,
    playingStyle: p.playing_style,
    balance: p.balance,
    flex: p.flex,
    weight: p.weight_spec,
    frameMaterial: p.frame_material,
    shaftMaterial: p.shaft_material,
    maxTension: p.max_tension,
    recommendedString: p.recommended_string,
    inBox: p.in_box,
    warranty: p.warranty,
    specs: p.specs || {},
    technologies: p.technologies || [],
    description: p.description,
    badge: p.badge,
    colors: p.colors || [],
    tags: p.tags || [],
    rating: p.rating ?? 0,
    reviews: p.review_count ?? 0,
    images,
    // Not present in the current schema — see note above.
    gripSizes: undefined,
    sizes: undefined,
  };
}

export function normalizeProducts(list) {
  return (Array.isArray(list) ? list : []).map(normalizeProduct).filter(Boolean);
}
