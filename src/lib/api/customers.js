// ── Customers API ─────────────────────────────────────────────────
import { supabase, isSupabaseConfigured } from '../supabase';
import { getUser } from '../auth';

export async function fetchCustomerProfile() {
  const { user } = await getUser();
  if (!user || !isSupabaseConfigured()) return { data: null, error: null };
  const { data, error } = await supabase
    .from('customers')
    .select(`*, customer_addresses(*)`)
    .eq('user_id', user.id)
    .single();
  return { data, error };
}

export async function updateCustomerProfile(updates) {
  const { user } = await getUser();
  if (!user) return { error: { message: 'Not authenticated' } };
  const { data, error } = await supabase
    .from('customers')
    .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() })
    .select().single();
  return { data, error };
}

export async function saveAddress(address) {
  const { user } = await getUser();
  if (!user) return { error: { message: 'Not authenticated' } };
  const payload = { user_id: user.id, ...address };
  if (payload.id) {
    const { id, ...rest } = payload;
    const { data, error } = await supabase.from('customer_addresses').update(rest).eq('id', id).select().single();
    return { data, error };
  }
  const { data, error } = await supabase.from('customer_addresses').insert([payload]).select().single();
  return { data, error };
}

export async function deleteAddress(addressId) {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', addressId);
  return { error };
}

// ── Admin ─────────────────────────────────────────────────────────
export async function fetchAllCustomers({ limit = 50, offset = 0, search } = {}) {
  let query = supabase.from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error };

  // customers.user_id and orders.user_id both reference auth.users
  // independently — there's no direct FK between customers and orders,
  // so PostgREST can't embed "orders(count)" here. Order stats (count,
  // lifetime spend, last order date) are computed separately instead.
  const userIds = (data || []).map(c => c.user_id).filter(Boolean);
  let statsByUser = {};
  if (userIds.length) {
    const { data: orderRows } = await supabase.from('orders').select('user_id, total, created_at').in('user_id', userIds);
    statsByUser = (orderRows || []).reduce((acc, o) => {
      const s = acc[o.user_id] || { count: 0, spend: 0, lastOrderAt: null };
      s.count += 1;
      s.spend += o.total || 0;
      if (!s.lastOrderAt || new Date(o.created_at) > new Date(s.lastOrderAt)) s.lastOrderAt = o.created_at;
      acc[o.user_id] = s;
      return acc;
    }, {});
  }

  const withStats = (data || []).map(c => {
    const s = statsByUser[c.user_id] || { count: 0, spend: 0, lastOrderAt: null };
    return { ...c, order_count: s.count, lifetime_spend: s.spend, last_order_at: s.lastOrderAt };
  });
  return { data: withStats, count, error: null };
}
