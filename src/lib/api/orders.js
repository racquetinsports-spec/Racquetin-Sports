// ── Orders API ────────────────────────────────────────────────────
// Order CREATION no longer happens here — the frontend is never
// trusted to create orders or set payment_status. That now only
// happens inside the verify-razorpay-payment / razorpay-webhook Edge
// Functions (see supabase/functions/), which run with the service
// role key and recompute everything server-side. This file only
// reads orders and (for admins) updates fulfillment status.
import { supabase, isSupabaseConfigured } from '../supabase';
import { getUser } from '../auth';

export async function fetchOrders() {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) return { data: [], error: null };
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*, product:product_id(name, slug)), payments(*)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function fetchOrderById(orderId) {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) return { data: null, error: null };
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*, product:product_id(name, slug, product_images(url, is_primary))), payments(*), shipments(*)`)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();
  return { data, error };
}

// ── Admin order management ────────────────────────────────────────
export async function fetchAllOrders({ status, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('orders')
    .select(`*, order_items(*), payments(*), shipments(*)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error };

  // orders.user_id references auth.users directly, not customers — no FK
  // from orders to customers for PostgREST to embed, so customer info is
  // fetched separately and merged in here (same pattern as fetchRecentOrders
  // in lib/api/admin.js and fetchAllCustomers in lib/api/customers.js).
  // payments/shipments DO have a real FK to orders, so those embed directly.
  const userIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))];
  let customersByUserId = {};
  if (userIds.length) {
    const { data: custRows } = await supabase.from('customers').select('user_id, full_name, email').in('user_id', userIds);
    customersByUserId = (custRows || []).reduce((acc, c) => { acc[c.user_id] = c; return acc; }, {});
  }

  const withCustomers = (data || []).map(o => ({ ...o, customers: customersByUserId[o.user_id] || null }));
  return { data: withCustomers, count: count || 0, error: null };
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select().single();
  return { data, error };
}
