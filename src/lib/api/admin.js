// ── Admin API ─────────────────────────────────────────────────────
// Dashboard analytics, site settings, homepage management.
import { supabase } from '../supabase';

// ── Analytics ─────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const [ordersRes, customersRes, revenueRes, lowStockRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total').eq('payment_status', 'paid'),
    supabase.from('products').select('id, name, stock').lt('stock', 10).eq('is_active', true).order('stock'),
  ]);
  const revenue = (revenueRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
  return {
    orders:    ordersRes.count || 0,
    customers: customersRes.count || 0,
    revenue,
    lowStock:  lowStockRes.data || [],
  };
}

export async function fetchRecentOrders(limit = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };

  // orders.user_id references auth.users directly, not customers — there's
  // no FK from orders to customers for PostgREST to embed, so customer info
  // is fetched separately and merged in here.
  const userIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))];
  let customersByUserId = {};
  if (userIds.length) {
    const { data: custRows } = await supabase.from('customers').select('user_id, full_name, email').in('user_id', userIds);
    customersByUserId = (custRows || []).reduce((acc, c) => { acc[c.user_id] = c; return acc; }, {});
  }

  const withCustomers = (data || []).map(o => ({ ...o, customers: customersByUserId[o.user_id] || null }));
  return { data: withCustomers, error: null };
}

export async function fetchRevenueByDay(days = 30) {
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', from)
    .order('created_at');
  return { data: data || [], error };
}

// ── Site Settings ─────────────────────────────────────────────────
export async function fetchSiteSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').single();
  return { data, error };
}

export async function updateSiteSettings(settings) {
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() })
    .select().single();
  return { data, error };
}

// ── Homepage sections ─────────────────────────────────────────────
export async function fetchHomepageSections() {
  const { data, error } = await supabase
    .from('homepage_sections')
    .select(`*, featured_products(*, products:product_id(*))`)
    .eq('is_active', true)
    .order('sort_order');
  return { data: data || [], error };
}

export async function updateHomepageSection(id, updates) {
  const { data, error } = await supabase
    .from('homepage_sections')
    .update(updates)
    .eq('id', id)
    .select().single();
  return { data, error };
}

// ── Coupons ───────────────────────────────────────────────────────
export async function validateCoupon(code, cartTotal) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();
  if (error || !data) return { valid: false, message: 'Invalid coupon code' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, message: 'Coupon has expired' };
  if (data.min_order_value && cartTotal < data.min_order_value) return { valid: false, message: `Minimum order value ₹${data.min_order_value / 100}` };
  if (data.usage_limit && data.usage_count >= data.usage_limit) return { valid: false, message: 'Coupon usage limit reached' };
  return { valid: true, coupon: data };
}

export async function fetchCoupons() {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function createCoupon(coupon) {
  const { data, error } = await supabase.from('coupons').insert([coupon]).select().single();
  return { data, error };
}

export async function updateCoupon(id, updates) {
  const { data, error } = await supabase.from('coupons').update(updates).eq('id', id).select().single();
  return { data, error };
}

// ── Newsletter ────────────────────────────────────────────────────
export async function subscribeToNewsletter(email) {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .upsert([{ email, subscribed_at: new Date().toISOString() }], { onConflict: 'email' })
    .select().single();
  return { data, error };
}

export async function fetchNewsletterSubscribers({ limit = 100, offset = 0 } = {}) {
  const { data, count, error } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact' })
    .order('subscribed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return { data: data || [], count, error };
}
