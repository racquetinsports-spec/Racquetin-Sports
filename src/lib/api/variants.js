// ── Product Variants API (admin) ──────────────────────────────────
// Each row is one purchasable option (e.g. "Size: UK8") with its own
// stock — this is what makes per-size inventory real rather than
// cosmetic. See supabase/migration_variant_inventory.sql for why this
// exists alongside (not replacing) the older free-form cart_items.variant
// JSONB tag used for racquet grip/color, which has no stock of its own.
import { supabase } from '../supabase';

export async function fetchVariantsForProduct(productId) {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('name')
    .order('value');
  return { data: data || [], error };
}

export async function createVariant(productId, { name, value, stock = 0, priceAdj = 0, skuSuffix = null, isActive = true }) {
  const { data, error } = await supabase
    .from('product_variants')
    .insert([{ product_id: productId, name, value, stock, price_adj: priceAdj, sku_suffix: skuSuffix, is_active: isActive }])
    .select().single();
  return { data, error };
}

export async function updateVariant(variantId, updates) {
  const { data, error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', variantId)
    .select().single();
  return { data, error };
}

export async function deleteVariant(variantId) {
  const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
  return { error };
}
