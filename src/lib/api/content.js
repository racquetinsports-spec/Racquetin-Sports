// ── Content API ───────────────────────────────────────────────────
// site_content is a simple key/value store for freeform website copy
// (hero text, brand story, footer, About page, etc.) — new sections
// can be added without another migration.
import { supabase } from '../supabase';

export async function fetchAllContent() {
  const { data, error } = await supabase.from('site_content').select('*');
  if (error) return { data: {}, error };
  const map = {};
  (data || []).forEach(row => { map[row.key] = row.value; });
  return { data: map, error: null };
}

// Upsert many keys at once (one round trip for a whole "Save" click).
export async function updateContent(entries) {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
  const { data, error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'key' })
    .select();
  return { data, error };
}

// ── FAQs ──────────────────────────────────────────────────────────
export async function fetchFaqs() {
  const { data, error } = await supabase.from('faqs').select('*').order('sort_order');
  return { data: data || [], error };
}

export async function createFaq(faq) {
  const { data, error } = await supabase.from('faqs').insert([faq]).select().single();
  return { data, error };
}

export async function updateFaq(id, updates) {
  const { data, error } = await supabase.from('faqs').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deleteFaq(id) {
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  return { error };
}
