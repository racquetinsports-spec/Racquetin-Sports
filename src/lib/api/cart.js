// ── Cart API ──────────────────────────────────────────────────────
// Persists cart to Supabase when logged in; localStorage when guest.
// Merges guest cart into DB cart on login.

import { supabase, isSupabaseConfigured } from '../supabase';
import { getUser } from '../auth';
import { resolveProductId } from './products';

const GUEST_CART_KEY = 'racquetin_guest_cart';

// ── Guest cart (localStorage) ─────────────────────────────────────
function getGuestCart()  { try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]'); } catch { return []; } }
function saveGuestCart(items) { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)); }
function clearGuestCart() { localStorage.removeItem(GUEST_CART_KEY); }

// ── Fetch cart ────────────────────────────────────────────────────
export async function fetchCart() {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    return { data: getGuestCart(), error: null, source: 'local' };
  }
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, qty, variant,
      products:product_id(id, name, price, slug, brand, series,
        product_images(url, is_primary))
    `)
    .eq('user_id', user.id);
  return { data: data || [], error, source: 'db' };
}

export async function addToCart(productId, qty = 1, variant = {}) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    const cart = getGuestCart();
    const key = `${productId}-${JSON.stringify(variant)}`;
    const existing = cart.find(i => i.key === key);
    if (existing) existing.qty += qty;
    else cart.push({ key, productId, qty, variant });
    saveGuestCart(cart);
    return { data: cart, error: null };
  }
  const resolvedId = await resolveProductId(productId);
  if (!resolvedId) {
    return { data: null, error: { message: 'This product isn\'t available online yet. Try again shortly.' } };
  }

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, qty')
    .eq('user_id', user.id)
    .eq('product_id', resolvedId)
    .eq('variant', variant)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ qty: existing.qty + qty, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select().single();
    return { data, error };
  }
  const { data, error } = await supabase
    .from('cart_items')
    .insert([{ user_id: user.id, product_id: resolvedId, qty, variant }])
    .select().single();
  return { data, error };
}

export async function updateCartQty(itemId, qty) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    const cart = getGuestCart();
    const item = cart.find(i => i.key === itemId);
    if (item) item.qty = qty;
    if (qty <= 0) cart.splice(cart.findIndex(i => i.key === itemId), 1);
    saveGuestCart(cart);
    return { data: cart, error: null };
  }
  if (qty <= 0) return removeFromCart(itemId);
  const { data, error } = await supabase
    .from('cart_items')
    .update({ qty, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select().single();
  return { data, error };
}

export async function removeFromCart(itemId) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    const cart = getGuestCart().filter(i => i.key !== itemId);
    saveGuestCart(cart);
    return { error: null };
  }
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  return { error };
}

export async function clearCart() {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) {
    clearGuestCart();
    return { error: null };
  }
  const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
  return { error };
}

// Merge guest cart into DB on login
export async function mergeGuestCart() {
  const guestCart = getGuestCart();
  if (!guestCart.length) return;
  for (const item of guestCart) {
    await addToCart(item.productId, item.qty, item.variant);
  }
  clearGuestCart();
}
