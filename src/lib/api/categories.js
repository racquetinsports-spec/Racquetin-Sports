// ── Categories API ────────────────────────────────────────────────
import { supabase } from '../supabase';

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  return { data: data || [], error };
}

export async function createCategory(category) {
  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select().single();
  return { data, error };
}

export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single();
  return { data, error };
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error };
}
