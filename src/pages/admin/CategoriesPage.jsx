// ── Admin: Categories ─────────────────────────────────────────────
// Redesigned (Phase 1 of the admin UI pass) — presentation only.
// Every existing API call (fetchCategories/createCategory/
// updateCategory/deleteCategory) and the FK-safe delete error
// handling below are unchanged from the original implementation.
//
// Known scope boundary, flagged rather than worked around: the brief
// asked for category image thumbnails, but `categories` has no
// image_url column, and the storefront's own category cover images
// are hardcoded static paths (see CATEGORIES in HomePage.jsx), not
// database-driven. Thumbnails here are a best-effort preview of that
// same static path (/images/categories/{slug}-cover.jpg), with a
// graceful placeholder when one doesn't exist — this page can't yet
// let an admin actually assign/change a category's image, since doing
// that properly needs one additive image_url column, which is a
// schema change and out of scope for this UI-only pass without your
// explicit go-ahead first.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api/categories';
import { fetchCategoryCounts } from '../../lib/api/products';
import { Toggle, Modal } from './shared/AdminUI';

function emptyCategoryForm() {
  return { name: '', slug: '', description: '', sort_order: 0, is_active: true };
}

const SORT_OPTIONS = [
  { value: 'sort_order', label: 'Sort Order' },
  { value: 'name-asc',   label: 'Name: A–Z' },
  { value: 'count-desc', label: 'Most Products' },
];

function sortCategories(list, sort, counts) {
  const sorted = [...list];
  if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'count-desc') sorted.sort((a, b) => (counts[b.slug] || 0) - (counts[a.slug] || 0));
  else sorted.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted;
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategoryForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'inactive'
  const [sort, setSort] = useState('sort_order');
  const [pendingSort, setPendingSort] = useState(null); // category id currently saving a sort_order edit

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchCategories();
    setCategories(data);
    setLoading(false);
    if (data.length) {
      const { data: countData } = await fetchCategoryCounts(data.map(c => c.slug));
      setCounts(countData || {});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = categories;
    if (statusFilter === 'active') list = list.filter(c => c.is_active);
    else if (statusFilter === 'inactive') list = list.filter(c => !c.is_active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    return sortCategories(list, sort, counts);
  }, [categories, statusFilter, search, sort, counts]);

  const totalProducts = useMemo(() => Object.values(counts).reduce((sum, n) => sum + n, 0), [counts]);

  function openCreate() { setForm(emptyCategoryForm()); setFormError(''); setEditing({}); }
  function openEdit(c) {
    setForm({ name: c.name || '', slug: c.slug || '', description: c.description || '', sort_order: c.sort_order ?? 0, is_active: c.is_active ?? true });
    setFormError('');
    setEditing(c);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) { setFormError('Name and slug are required.'); return; }
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
    const { error } = editing.id ? await updateCategory(editing.id, payload) : await createCategory(payload);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save category.'); return; }
    setEditing(null);
    load();
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? This only works if no products use it.`)) return;
    const { error } = await deleteCategory(cat.id);
    if (error) {
      alert(error.message?.includes('foreign key') || error.code === '23503'
        ? `Can't delete "${cat.name}" — one or more products still use this category. Reassign or delete those products first.`
        : (error.message || 'Could not delete category.'));
      return;
    }
    load();
  }

  async function handleToggleActive(cat, value) {
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: value } : c));
    await updateCategory(cat.id, { is_active: value });
  }

  async function handleSortOrderChange(cat, value) {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, sort_order: num } : c));
    setPendingSort(cat.id);
    await updateCategory(cat.id, { sort_order: num });
    setPendingSort(null);
  }

  const hasFilters = search.trim() || statusFilter;

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Categories</h1>
          <p className="apc-subtitle">Organize your storefront navigation and product groupings.</p>
        </div>
        <div className="apc-header-right">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Category</button>
        </div>
      </div>

      {!loading && categories.length > 0 && (
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{categories.length}</div>
            <div className="admin-stat-label">Total Categories</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{categories.filter(c => c.is_active).length}</div>
            <div className="admin-stat-label">Active</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{categories.filter(c => !c.is_active).length}</div>
            <div className="admin-stat-label">Inactive</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{totalProducts.toLocaleString()}</div>
            <div className="admin-stat-label">Active Products</div>
          </div>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="acg-toolbar">
          <div className="acg-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="acg-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="acg-card acg-skeleton">
              <div className="acg-skel-img" />
              <div className="acg-card-body">
                <div className="acg-skel-line" style={{ width: '60%' }} />
                <div className="acg-skel-line" style={{ width: '90%' }} />
                <div className="acg-skel-line" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </div>
          <h3>No categories yet</h3>
          <p>Categories organize your storefront navigation and let customers browse by product type.</p>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>Create your first category</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No categories match your filters</h3>
          <p>Try a different search term or clear the status filter.</p>
          {hasFilters && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>}
        </div>
      ) : (
        <div className="acg-grid">
          {filtered.map(c => (
            <div key={c.id} className={`acg-card ${!c.is_active ? 'acg-card-inactive' : ''}`}>
              <div className="acg-card-img">
                <img
                  src={`/images/categories/${c.slug}-cover.jpg`}
                  alt=""
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
                <div className="acg-card-img-fallback" style={{ display: 'none' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
                </div>
                <span className={`acg-badge ${c.is_active ? 'acg-badge-active' : 'acg-badge-inactive'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="acg-card-body">
                <div className="acg-card-title-row">
                  <h3>{c.name}</h3>
                  <span className="acg-count">{counts[c.slug] ?? 0} {counts[c.slug] === 1 ? 'product' : 'products'}</span>
                </div>
                <div className="admin-muted t-small">/{c.slug}</div>
                {c.description && <p className="acg-desc">{c.description}</p>}

                <div className="acg-card-controls">
                  <label className="acg-sort-field">
                    <span>Sort</span>
                    <input
                      type="number"
                      className="input"
                      value={c.sort_order ?? 0}
                      disabled={pendingSort === c.id}
                      onChange={e => handleSortOrderChange(c, e.target.value)}
                    />
                  </label>
                  <Toggle checked={c.is_active} onChange={v => handleToggleActive(c, v)} label="Active" />
                </div>

                <div className="acg-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Category' : 'New Category'} onClose={() => setEditing(null)}>
          <div className="admin-form-grid">
            <label className="admin-field"><span>Name *</span><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="admin-field"><span>Slug *</span><input className="input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></label>
            <label className="admin-field admin-field-wide"><span>Description</span><textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
            <label className="admin-field"><span>Sort Order</span><input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></label>
            <div className="admin-field" style={{ display: 'flex', alignItems: 'center' }}>
              <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
            </div>
          </div>

          {editing.id && (
            <div className="acg-modal-cover-note">
              Cover image shown on this category's card comes from <code>/images/categories/{form.slug || '…'}-cover.jpg</code> — this isn't manageable from here yet (it isn't stored in the database). To change it, replace that file directly, or ask about adding proper per-category image upload via the <Link to="/admin/content">Media Library</Link>.
            </div>
          )}

          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Category'}</button>
          </div>
        </Modal>
      )}

      <style>{`
        .acg-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .acg-search { display:flex; align-items:center; gap:8px; flex:1; min-width:200px; padding:8px 14px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); color:var(--gr-2); }
        .acg-search input { border:none; outline:none; font-size:13px; width:100%; background:transparent; color:var(--bk); }
        .acg-search svg { flex-shrink:0; }

        .acg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:18px; }

        .acg-card { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); overflow:hidden; transition:var(--trans); }
        .acg-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--gr-4); }
        .acg-card-inactive { opacity:.68; }

        .acg-card-img { position:relative; aspect-ratio:16/9; background:var(--gr-6); overflow:hidden; }
        .acg-card-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .acg-card-img-fallback { width:100%; height:100%; align-items:center; justify-content:center; color:var(--gr-3); }

        .acg-badge { position:absolute; top:10px; right:10px; padding:3px 10px; border-radius:100px; font-size:10px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; backdrop-filter:blur(6px); }
        .acg-badge-active { background:rgba(16,185,129,.15); color:#10b981; }
        .acg-badge-inactive { background:rgba(107,114,128,.2); color:#4b5563; }

        .acg-card-body { padding:16px; }
        .acg-card-title-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
        .acg-card-title-row h3 { font-size:15px; font-weight:600; letter-spacing:-.01em; }
        .acg-count { font-size:11px; color:var(--gr-2); white-space:nowrap; flex-shrink:0; }
        .acg-desc { font-size:12.5px; color:var(--gr-2); margin-top:8px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

        .acg-card-controls { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; padding-top:14px; border-top:1px solid var(--gr-5); }
        .acg-sort-field { display:flex; align-items:center; gap:6px; }
        .acg-sort-field span { font-size:11px; color:var(--gr-2); }
        .acg-sort-field input { width:52px; padding:5px 8px; font-size:12px; }

        .acg-card-actions { display:flex; gap:8px; margin-top:12px; }
        .acg-card-actions .btn { flex:1; }

        .acg-modal-cover-note { margin-top:4px; padding:10px 12px; background:var(--gr-6); border-radius:var(--r-sm); font-size:12px; color:var(--gr-1); line-height:1.5; }
        .acg-modal-cover-note code { font-size:11px; background:var(--gr-5); padding:1px 5px; border-radius:3px; }
        .acg-modal-cover-note a { color:var(--cr); text-decoration:underline; }

        .acg-skeleton { pointer-events:none; }
        .acg-skel-img { aspect-ratio:16/9; background:linear-gradient(90deg, var(--gr-6) 25%, var(--gr-5) 50%, var(--gr-6) 75%); background-size:200% 100%; animation:acg-shimmer 1.4s infinite; }
        .acg-skel-line { height:11px; border-radius:3px; margin-top:10px; background:linear-gradient(90deg, var(--gr-6) 25%, var(--gr-5) 50%, var(--gr-6) 75%); background-size:200% 100%; animation:acg-shimmer 1.4s infinite; }
        @keyframes acg-shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

        @media(max-width:640px){ .acg-grid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
