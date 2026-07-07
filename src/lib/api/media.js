// ── Media Library API ─────────────────────────────────────────────
// Browses and manages files in the two public storage buckets
// (product-images, site-assets). Folders are just path prefixes —
// Supabase Storage has no real folder concept, so the Media Library
// UI organizes uploads by prefix (e.g. "homepage/", "logo/").
import { supabase } from '../supabase';

export async function listMedia(bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) return { data: [], error };
  const files = (data || [])
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => {
      const path = prefix ? `${prefix}/${f.name}` : f.name;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      return { name: f.name, path, url: publicUrl, size: f.metadata?.size, createdAt: f.created_at };
    });
  return { data: files, error: null };
}

export async function uploadMedia(bucket, prefix, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = prefix ? `${prefix}/${Date.now()}-${safeName}` : `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) return { data: null, error };
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return { data: { path, url: publicUrl }, error: null };
}

// Replaces an existing file at the same path (upsert) so its public URL
// never changes — useful for swapping a logo/banner without having to
// update anywhere else that already links to it.
export async function replaceMedia(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return { data: null, error };
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return { data: { path, url: `${publicUrl}?t=${Date.now()}` }, error: null }; // cache-bust so the new image shows immediately
}

export async function deleteMedia(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error };
}
