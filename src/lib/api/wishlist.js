// ── Wishlist API ──────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from '../supabase';
import { getUser } from '../auth';
import { resolveProductId } from './products';

const GUEST_WISHLIST_KEY = 'racquetin_guest_wishlist';

function getGuestWishlist() { try { return JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) || '[]'); } catch { return []; } }
function saveGuestWishlist(ids) { localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids)); }

export async function fetchWishlist() {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) return { data: getGuestWishlist(), error: null };
  const { data, error } = await supabase
    .from('wishlists')
    .select(`product_id, products:product_id(id, name, price, slug, brand, series, product_images(url, is_primary))`)
    .eq('user_id', user.id);
  return { data: data || [], error };
}

export async function toggleWishlist(productId) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    const ids = getGuestWishlist();
    const idx = ids.indexOf(productId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(productId);
    saveGuestWishlist(ids);
    return { inWishlist: ids.includes(productId), error: null };
  }
  const resolvedId = await resolveProductId(productId);
  if (!resolvedId) return { inWishlist: false, error: { message: 'This product isn\'t available online yet.' } };

  const { data: existing } = await supabase
    .from('wishlists').select('id').eq('user_id', user.id).eq('product_id', resolvedId).single();
  if (existing) {
    await supabase.from('wishlists').delete().eq('id', existing.id);
    return { inWishlist: false, error: null };
  }
  const { error } = await supabase.from('wishlists').insert([{ user_id: user.id, product_id: resolvedId }]);
  return { inWishlist: !error, error };
}

// Merge guest wishlist (localStorage) into DB on login
export async function mergeGuestWishlist() {
  const guestIds = getGuestWishlist();
  if (!guestIds.length) return;
  for (const id of guestIds) {
    await toggleWishlistIfAbsent(id);
  }
  localStorage.removeItem(GUEST_WISHLIST_KEY);
}

async function toggleWishlistIfAbsent(productId) {
  const { user } = await getUser();
  if (!user) return;
  const resolvedId = await resolveProductId(productId);
  if (!resolvedId) return;
  const { data: existing } = await supabase
    .from('wishlists').select('id').eq('user_id', user.id).eq('product_id', resolvedId).single();
  if (!existing) {
    await supabase.from('wishlists').insert([{ user_id: user.id, product_id: resolvedId }]);
  }
}

export async function isInWishlist(productId) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) return getGuestWishlist().includes(productId);
  const { data } = await supabase.from('wishlists').select('id').eq('user_id', user.id).eq('product_id', productId).single();
  return !!data;
}
