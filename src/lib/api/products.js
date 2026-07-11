// ── Products API ──────────────────────────────────────────────────
// All product reads go through this module.
// Falls back gracefully to local product data if Supabase is not configured.

import { supabase, isSupabaseConfigured } from '../supabase';
import { products as localProducts, getById as localGetById, getByCategory as localGetByCategory, searchProducts as localSearch, getBestSellers as localBestSellers, getNewArrivals as localNewArrivals } from '../../data/products';

// ── Slug → UUID resolution ──────────────────────────────────────────
// Local catalogue IDs (e.g. 'arcsaber-7-tour') are slugs, but Supabase
// tables key on a generated UUID. Cart/wishlist/order writes need the
// real UUID, so this resolves + caches slug → id lookups against the
// seeded `products` table (see supabase/seed_products.sql).
const _productIdCache = new Map();

export async function resolveProductId(slugOrId) {
  if (!isSupabaseConfigured()) return slugOrId; // local mode: ids are already slugs
  if (_productIdCache.has(slugOrId)) return _productIdCache.get(slugOrId);
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slugOrId)
    .maybeSingle();
  if (error || !data) return null;
  _productIdCache.set(slugOrId, data.id);
  return data.id;
}

export async function fetchProductsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (uniqueIds.length === 0) return { data: [], error: null };

  if (!isSupabaseConfigured()) {
    const data = uniqueIds.map(localGetById).filter(Boolean);
    return { data, error: null };
  }

  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(url, is_primary, sort_order), categories(name, slug)`)
    .or(uniqueIds.map(id => `slug.eq.${id}`).join(','));
  return { data: data || [], error };
}

// One lightweight head-count query per category (no rows fetched) —
// used for the "N Items" label on the homepage category cards.
export async function fetchCategoryCounts(slugs) {
  if (!isSupabaseConfigured()) {
    const counts = {};
    for (const slug of slugs) counts[slug] = localGetByCategory(slug).length;
    return { data: counts, error: null };
  }

  const results = await Promise.all(slugs.map(async slug => {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_slug', slug)
      .eq('is_active', true);
    return { slug, count: error ? 0 : (count || 0) };
  }));

  const counts = {};
  results.forEach(r => { counts[r.slug] = r.count; });
  return { data: counts, error: null };
}

// One lightweight query (brand + category only, no images/joins) used
// to build the nav's "Shop by Brand" dropdowns and the mobile drawer's
// expandable category lists — replaces what used to be a hand-written,
// unmaintained list of test series / fake product names per category.
// Brands are deduped, sorted, and any category with zero active
// products carrying a brand is simply omitted from the result so the
// nav never renders an empty dropdown.
export async function fetchBrandsByCategory(categorySlugs) {
  if (!isSupabaseConfigured()) {
    const map = {};
    categorySlugs.forEach(slug => {
      const brands = [...new Set(localGetByCategory(slug).map(p => p.brand).filter(Boolean))].sort();
      if (brands.length) map[slug] = brands;
    });
    return { data: map, error: null };
  }

  const { data, error } = await supabase
    .from('products')
    .select('brand, category_slug')
    .eq('is_active', true)
    .in('category_slug', categorySlugs)
    .not('brand', 'is', null);

  if (error) return { data: {}, error };

  const sets = {};
  (data || []).forEach(row => {
    if (!row.brand) return;
    (sets[row.category_slug] ||= new Set()).add(row.brand.trim());
  });

  const result = {};
  Object.entries(sets).forEach(([slug, set]) => {
    if (set.size) result[slug] = [...set].sort();
  });
  return { data: result, error: null };
}

// ── Reads ─────────────────────────────────────────────────────────

export async function fetchProducts({ category, series, brand, playerLevel, playingStyle, balance, flex, minPrice, maxPrice, sort = 'featured', search, limit = 60, offset = 0 } = {}) {
  if (!isSupabaseConfigured()) {
    // Graceful fallback to static data
    let result = category ? localGetByCategory(category) : localProducts;
    if (search) result = localSearch(search).filter(p => !category || p.category === category);
    if (brand)        result = result.filter(p => p.brand?.toLowerCase() === brand.toLowerCase());
    if (series)       result = result.filter(p => p.series?.toLowerCase() === series.toLowerCase());
    if (playerLevel)  result = result.filter(p => p.playerLevel?.toLowerCase().includes(playerLevel.toLowerCase()));
    if (playingStyle) result = result.filter(p => p.playingStyle?.toLowerCase().includes(playingStyle.toLowerCase()));
    if (balance)      result = result.filter(p => p.balance?.toLowerCase().includes(balance.toLowerCase()));
    if (flex)         result = result.filter(p => p.flex?.toLowerCase().includes(flex.toLowerCase()));
    if (minPrice)     result = result.filter(p => p.price >= minPrice);
    if (maxPrice)     result = result.filter(p => p.price <= maxPrice);
    if (sort === 'price-asc')  result = [...result].sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') result = [...result].sort((a,b) => b.price - a.price);
    if (sort === 'rating')     result = [...result].sort((a,b) => b.rating - a.rating);
    return { data: result.slice(offset, offset + limit), count: result.length, error: null };
  }

  let query = supabase
    .from('products')
    .select(`
      *,
      product_images(url, is_primary, sort_order),
      categories(name, slug)
    `, { count: 'exact' })
    .eq('is_active', true);

  if (search)       query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%,series.ilike.%${search}%`);
  if (category)     query = query.eq('category_slug', category);
  if (brand)        query = query.ilike('brand', brand);
  if (series)       query = query.ilike('series', series);
  if (playerLevel)  query = query.ilike('player_level', `%${playerLevel}%`);
  if (playingStyle) query = query.ilike('playing_style', `%${playingStyle}%`);
  if (balance)      query = query.ilike('balance', `%${balance}%`);
  if (flex)         query = query.ilike('flex', `%${flex}%`);
  if (minPrice)     query = query.gte('price', minPrice);
  if (maxPrice)     query = query.lte('price', maxPrice);

  if (sort === 'price-asc')  query = query.order('price', { ascending: true });
  else if (sort === 'price-desc') query = query.order('price', { ascending: false });
  else if (sort === 'rating') query = query.order('rating', { ascending: false });
  else query = query.order('sort_order').order('created_at', { ascending: false });

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  return { data: data || [], count: count || 0, error };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchProductById(id) {
  if (!isSupabaseConfigured()) {
    const p = localGetById(id);
    return { data: p || null, error: p ? null : { message: 'Product not found' } };
  }

  const selectClause = `*, product_images(url, alt_text, is_primary, sort_order), categories(name, slug), product_variants(id, name, value, stock, is_active, price_adj, sku_suffix)`;

  // Primary lookup — every link in the app (ProductCard, search, wishlist,
  // homepage sections) navigates using the product's slug, never its raw
  // UUID. This used to be a single `.or('id.eq.X,slug.eq.X')` filter, but
  // `id` is a UUID column — Postgres throws "invalid input syntax for
  // type uuid" the instant X isn't UUID-shaped, and it throws for the
  // *entire* query, not just that one clause, since a `.or()` filter is
  // one SQL expression, not two independent attempts. Since slugs are
  // never UUID-shaped, that meant this failed for every real product,
  // every time — this is the fix: query by slug first, on its own.
  const { data: bySlug, error: slugError } = await supabase
    .from('products')
    .select(selectClause)
    .eq('slug', id)
    .maybeSingle();
  if (slugError) return { data: null, error: slugError };
  if (bySlug) return { data: bySlug, error: null };

  // Fallback — the param might be a raw product UUID (an old direct
  // link, or a product that was never given a slug). Only attempt this
  // if it's actually UUID-shaped, for the exact reason above.
  if (UUID_RE.test(id)) {
    const { data: byId, error: idError } = await supabase
      .from('products')
      .select(selectClause)
      .eq('id', id)
      .maybeSingle();
    if (idError) return { data: null, error: idError };
    if (byId) return { data: byId, error: null };
  }

  // Last resort — the slug may have changed since this link was shared
  // (see updateProduct(), which records the old slug here whenever an
  // admin renames one). If we find a match, return the current product
  // with a redirect hint so the page can send the visitor to the
  // product's current URL instead of a dead end.
  const { data: historyRow } = await supabase
    .from('product_slug_history')
    .select('product_id')
    .eq('old_slug', id)
    .maybeSingle();
  if (historyRow?.product_id) {
    const { data: redirected, error: redirectError } = await supabase
      .from('products')
      .select(selectClause)
      .eq('id', historyRow.product_id)
      .maybeSingle();
    if (redirectError) return { data: null, error: redirectError };
    if (redirected) return { data: redirected, error: null, redirectTo: redirected.slug };
  }

  return { data: null, error: { message: 'Product not found' } };
}

export async function fetchBestSellers(limit = 6) {
  if (!isSupabaseConfigured()) return { data: localBestSellers().slice(0, limit), error: null };
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(url, is_primary)`)
    .eq('is_best_seller', true)
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function fetchNewArrivals(limit = 6) {
  if (!isSupabaseConfigured()) return { data: localNewArrivals().slice(0, limit), error: null };
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(url, is_primary)`)
    .eq('is_new_arrival', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function fetchRelated(productId, category, limit = 4) {
  if (!isSupabaseConfigured()) {
    const p = localGetById(productId);
    const related = localGetByCategory(category).filter(r => r.id !== productId).slice(0, limit);
    return { data: related, error: null };
  }
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(url, is_primary)`)
    .eq('category_slug', category)
    .neq('id', productId)
    .eq('is_active', true)
    .limit(limit);
  return { data: data || [], error };
}

// ── Admin reads ───────────────────────────────────────────────────
// Unlike fetchProducts() above, this does NOT filter to is_active=true —
// admins need to see (and re-activate) disabled products too.
export async function fetchAllProductsAdmin({ search, category, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('products')
    .select(`*, product_images(url, is_primary, sort_order), categories(name, slug)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,series.ilike.%${search}%`);
  if (category) query = query.eq('category_slug', category);
  const { data, error, count } = await query;
  return { data: data || [], count: count || 0, error };
}

// ── Admin writes ──────────────────────────────────────────────────

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
  return { data, error };
}

export async function updateProduct(id, updates) {
  // If the slug is changing, keep a record of the old one first — this
  // is what lets fetchProductById() redirect an old shared/bookmarked
  // link to the product's new URL instead of showing "not found".
  if (updates.slug) {
    const { data: current } = await supabase.from('products').select('slug').eq('id', id).maybeSingle();
    if (current?.slug && current.slug !== updates.slug) {
      await supabase.from('product_slug_history').insert([{ product_id: id, old_slug: current.slug }]);
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteProduct(id) {
  // Soft delete — keeps order history intact
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { data, error };
}

export async function fetchImagesForProduct(productId) {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order');
  return { data: data || [], error };
}

export async function setPrimaryImage(productId, imageId) {
  // Only one image should be primary at a time — clear the rest first.
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  const { data, error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId).select().single();
  return { data, error };
}

export async function reorderProductImage(imageId, sortOrder) {
  const { data, error } = await supabase.from('product_images').update({ sort_order: sortOrder }).eq('id', imageId).select().single();
  return { data, error };
}

export async function uploadProductImage(productId, file) {
  const ext = file.name.split('.').pop();
  const path = `products/${productId}/${Date.now()}.${ext}`;
  const { data: upload, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: false });
  if (uploadError) return { data: null, error: uploadError };

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  // The first image for a product becomes primary automatically —
  // otherwise a product could sit with images but no explicit primary
  // flag, leaving which one displays as the thumbnail down to sort_order
  // tie-breaking rather than a clear choice.
  const { count } = await supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', productId);
  const isFirstImage = !count;

  const { data, error } = await supabase
    .from('product_images')
    .insert([{ product_id: productId, url: publicUrl, storage_path: path, is_primary: isFirstImage }])
    .select()
    .single();
  return { data, error };
}

export async function deleteProductImage(imageId, storagePath) {
  if (storagePath) {
    await supabase.storage.from('product-images').remove([storagePath]);
  }
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  return { error };
}
