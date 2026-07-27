// ── Admin: Products ────────────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../../utils/format';
import {
  fetchAllProductsAdmin, createProduct, updateProduct, deleteProduct,
  fetchImagesForProduct, uploadProductImage, deleteProductImage, setPrimaryImage, reorderProductImage,
} from '../../lib/api/products';
import { fetchCategories } from '../../lib/api/categories';
import {
  fetchVariantsForProduct, createVariant, updateVariant, deleteVariant,
} from '../../lib/api/variants';
import { Toggle, Modal } from './shared/AdminUI';

const csv = (arr) => (arr || []).join(', ');
const parseCsv = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

// ═══════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════

const PRODUCT_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
const PRODUCT_STYLES = ['Attacking', 'Defensive', 'All-Round'];
const PRODUCT_BALANCE = ['Head-Heavy', 'Even Balance', 'Head-Light'];
const PRODUCT_FLEX = ['Flexible', 'Medium', 'Medium-Stiff', 'Stiff', 'Extra Stiff'];
const PRODUCT_BADGES = ['', 'Best Seller', 'New', 'Pro Choice', 'Limited Edition', 'Sale'];

function emptyProductForm(categorySlug) {
  return {
    slug: '', name: '', brand: '', series: '', series_code: '',
    category_slug: categorySlug || '', price: '', original_price: '', stock: 0, sku: '',
    player_level: '', playing_style: '', balance: '', flex: '',
    weight_spec: '', frame_material: '', shaft_material: '', max_tension: '', recommended_string: '',
    in_box: '', warranty: '', specs: '{}', technologies: '',
    description: '', badge: '', colors: '', tags: '',
    is_active: true, is_best_seller: false, is_new_arrival: false, is_featured: false,
    sort_order: 0, meta_title: '', meta_desc: '',
  };
}

function productToForm(p) {
  return {
    slug: p.slug || '', name: p.name || '', brand: p.brand || '', series: p.series || '', series_code: p.series_code || '',
    category_slug: p.category_slug || '', price: p.price ?? '', original_price: p.original_price ?? '', stock: p.stock ?? 0, sku: p.sku || '',
    player_level: p.player_level || '', playing_style: p.playing_style || '', balance: p.balance || '', flex: p.flex || '',
    weight_spec: p.weight_spec || '', frame_material: p.frame_material || '', shaft_material: p.shaft_material || '',
    max_tension: p.max_tension || '', recommended_string: p.recommended_string || '',
    in_box: csv(p.in_box), warranty: p.warranty || '', specs: JSON.stringify(p.specs || {}, null, 2), technologies: csv(p.technologies),
    description: p.description || '', badge: p.badge || '', colors: csv(p.colors), tags: csv(p.tags),
    is_active: p.is_active ?? true, is_best_seller: !!p.is_best_seller, is_new_arrival: !!p.is_new_arrival, is_featured: !!p.is_featured,
    sort_order: p.sort_order ?? 0, meta_title: p.meta_title || '', meta_desc: p.meta_desc || '',
  };
}

function formToPayload(f) {
  let specs = {};
  try { specs = JSON.parse(f.specs || '{}'); } catch { /* leave as {} if invalid JSON — surfaced via validation below */ }
  return {
    slug: f.slug.trim(), name: f.name.trim(), brand: f.brand || null, series: f.series || null, series_code: f.series_code || null,
    category_slug: f.category_slug, price: Number(f.price) || 0, original_price: f.original_price ? Number(f.original_price) : null,
    stock: Number(f.stock) || 0, sku: f.sku || null,
    player_level: f.player_level || null, playing_style: f.playing_style || null, balance: f.balance || null, flex: f.flex || null,
    weight_spec: f.weight_spec || null, frame_material: f.frame_material || null, shaft_material: f.shaft_material || null,
    max_tension: f.max_tension || null, recommended_string: f.recommended_string || null,
    in_box: parseCsv(f.in_box), warranty: f.warranty || null, specs, technologies: parseCsv(f.technologies),
    description: f.description || null, badge: f.badge || null, colors: parseCsv(f.colors), tags: parseCsv(f.tags),
    is_active: f.is_active, is_best_seller: f.is_best_seller, is_new_arrival: f.is_new_arrival, is_featured: f.is_featured,
    sort_order: Number(f.sort_order) || 0, meta_title: f.meta_title || null, meta_desc: f.meta_desc || null,
  };
}

const STOCK_FILTERS = [
  { value: '', label: 'All Stock' },
  { value: 'low', label: 'Low Stock (<10)' },
  { value: 'out', label: 'Out of Stock' },
];
const ACTIVE_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];
const PRODUCT_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Alphabetical' },
  { value: 'stock-asc', label: 'Stock: Low to High' },
];
const PRODUCTS_PREFS_KEY = 'racquetin_admin_products_prefs';

function loadProductsPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PRODUCTS_PREFS_KEY) || '{}');
    return {
      search: p.search || '',
      stockFilter: p.stockFilter || '',
      activeFilter: p.activeFilter || '',
      sort: p.sort || 'newest',
      expandedCategory: p.expandedCategory ?? null,
    };
  } catch {
    return { search: '', stockFilter: '', activeFilter: '', sort: 'newest', expandedCategory: null };
  }
}

export function AdminProductsPage() {
  const initialPrefs = useMemo(loadProductsPrefs, []);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); // only true for the very first load
  const [search, setSearch] = useState(initialPrefs.search);
  const [stockFilter, setStockFilter] = useState(initialPrefs.stockFilter);
  const [activeFilter, setActiveFilter] = useState(initialPrefs.activeFilter);
  const [sort, setSort] = useState(initialPrefs.sort);
  const [expandedCategory, setExpandedCategory] = useState(initialPrefs.expandedCategory);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(() => new Set()); // `${id}:${field}` currently saving
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProductForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    Promise.all([
      fetchAllProductsAdmin({ limit: 300 }),
      fetchCategories(),
    ]).then(([p, c]) => {
      setProducts(p.data);
      setCategories(c.data);
      setLoading(false);
      // Default to the first category only if nothing was remembered before.
      setExpandedCategory(cur => cur !== null ? cur : (c.data[0]?.slug ?? null));
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    localStorage.setItem(PRODUCTS_PREFS_KEY, JSON.stringify({ search, stockFilter, activeFilter, sort, expandedCategory }));
  }, [search, stockFilter, activeFilter, sort, expandedCategory]);

  // Accordion: opening one category closes whichever was open before —
  // "remember the last expanded category" means exactly one at a time.
  function toggleExpand(slug) { setExpandedCategory(cur => cur === slug ? null : slug); }

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    if (stockFilter === 'low') list = list.filter(p => p.stock > 0 && p.stock < 10);
    if (stockFilter === 'out') list = list.filter(p => p.stock === 0);
    if (activeFilter === 'active') list = list.filter(p => p.is_active);
    if (activeFilter === 'inactive') list = list.filter(p => !p.is_active);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'stock-asc': return a.stock - b.stock;
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [products, search, stockFilter, activeFilter, sort]);

  const grouped = useMemo(() => {
    const map = {};
    for (const p of filtered) (map[p.category_slug] ||= []).push(p);
    return map;
  }, [filtered]);

  function openCreate() { setForm(emptyProductForm(categories[0]?.slug)); setFormError(''); setEditing({}); }
  function openEdit(p) { setForm(productToForm(p)); setFormError(''); setEditing(p); }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim() || !form.slug.trim() || !form.category_slug || !form.price) {
      setFormError('Name, slug, category, and price are required.');
      return;
    }
    let payload;
    try { payload = formToPayload(form); } catch { setFormError('Specs JSON is invalid — please check the syntax.'); return; }
    setSaving(true);
    const isNew = !editing.id;
    const { error } = isNew ? await createProduct(payload) : await updateProduct(editing.id, payload);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save product.'); return; }
    setEditing(null);
    if (isNew) {
      // A brand-new product needs the category/image join shape — cheapest
      // correct way to get that is one full reload, but only for creates.
      load();
    } else {
      // Editing an existing row: merge the change in place, no reload/flash.
      setProducts(list => list.map(p => p.id === editing.id ? { ...p, ...payload } : p));
    }
  }

  // Optimistic toggle: update local state immediately, save in the
  // background, disable only this control while saving, revert on failure.
  // Never re-shows the full-page "Loading…" state for a single edit.
  async function toggleField(product, field) {
    const key = `${product.id}:${field}`;
    const prevValue = product[field];
    setPending(s => new Set(s).add(key));
    setProducts(list => list.map(p => p.id === product.id ? { ...p, [field]: !prevValue } : p));
    const { error } = await updateProduct(product.id, { [field]: !prevValue });
    setPending(s => { const n = new Set(s); n.delete(key); return n; });
    if (error) {
      setProducts(list => list.map(p => p.id === product.id ? { ...p, [field]: prevValue } : p));
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This deactivates it (order history is preserved) — it can be restored via the Active toggle.`)) return;
    setProducts(list => list.filter(p => p.id !== product.id));
    const { error } = await deleteProduct(product.id);
    if (error) load(); // restore true state if it failed
  }

  function toggleSelect(id) {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleSelectCategory(slug, items) {
    setSelected(s => {
      const n = new Set(s);
      const allSelected = items.every(p => n.has(p.id));
      items.forEach(p => { if (allSelected) n.delete(p.id); else n.add(p.id); });
      return n;
    });
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${ids.length} product${ids.length !== 1 ? 's' : ''}? This deactivates them (order history is preserved).`)) return;
    const patch = {
      activate:   { is_active: true },
      deactivate: { is_active: false },
      bestseller: { is_best_seller: true },
      newarrival: { is_new_arrival: true },
    }[action];
    if (action === 'delete') {
      await Promise.all(ids.map(id => deleteProduct(id)));
    } else {
      await Promise.all(ids.map(id => updateProduct(id, patch)));
    }
    setSelected(new Set());
    load();
  }

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <p className="apc-subtitle">Manage your catalogue, inventory and product visibility.</p>
        </div>
        <div className="apc-header-right">
          <span className="admin-muted t-small">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Product</button>
        </div>
      </div>

      <div className="apc-filters-section">
        <div className="apc-filters">
          <input className="input apc-search" placeholder="Search name, brand, or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
            {STOCK_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select className="select" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
            {ACTIVE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {PRODUCT_SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="apc-bulk-bar"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: .2 }}
          >
            <span className="t-small">{selected.size} selected</span>
            <button className="btn btn-outline btn-sm" onClick={() => bulkAction('activate')}>Activate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkAction('deactivate')}>Deactivate</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkAction('bestseller')}>Mark Best Seller</button>
            <button className="btn btn-outline btn-sm" onClick={() => bulkAction('newarrival')}>Mark New Arrival</button>
            <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => bulkAction('delete')}>Delete</button>
            <button className="admin-link t-small" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Clear selection</button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="admin-page-loading">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3m18 0-9 5-9-5m18 0v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/></svg>
          </div>
          <h3>No products yet</h3>
          <p>Products you add will be grouped here by category.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No products match your filters</h3>
          <p>Try a different search term, or clear the stock/status filters.</p>
        </div>
      ) : (
        <div className="apc-categories">
          {categories.map(cat => {
            const items = grouped[cat.slug] || [];
            const open = expandedCategory === cat.slug;
            const allSelected = items.length > 0 && items.every(p => selected.has(p.id));
            return (
              <div key={cat.slug} className="apc-category">
                <button className="apc-category-header" onClick={() => toggleExpand(cat.slug)}>
                  <svg className={`apc-chevron ${open ? 'apc-chevron-open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  <span className="apc-category-name">{cat.name}</span>
                  <span className="apc-category-count">{items.length}</span>
                </button>

                <AnimatePresence initial={false}>
                  {open && items.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: .25, ease: [.16, 1, .3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="apc-select-all">
                        <label className="apc-checkbox-label">
                          <input type="checkbox" checked={allSelected} onChange={() => toggleSelectCategory(cat.slug, items)} />
                          <span className="t-small admin-muted">Select all in {cat.name}</span>
                        </label>
                      </div>
                      <div className="apc-rows">
                        {items.map(p => (
                          <ProductRow
                            key={p.id}
                            product={p}
                            selected={selected.has(p.id)}
                            onSelect={() => toggleSelect(p.id)}
                            onToggleField={field => toggleField(p, field)}
                            pendingActive={pending.has(`${p.id}:is_active`)}
                            pendingBest={pending.has(`${p.id}:is_best_seller`)}
                            pendingNew={pending.has(`${p.id}:is_new_arrival`)}
                            onEdit={() => openEdit(p)}
                            onDelete={() => handleDelete(p)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Product' : 'New Product'} onClose={() => setEditing(null)} wide>
          <div className="admin-form-grid">
            <label className="admin-field"><span>Name *</span><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="admin-field"><span>Slug *</span><input className="input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></label>
            <label className="admin-field"><span>Category *</span>
              <select className="select" value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
            <label className="admin-field"><span>Brand</span><input className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></label>
            <label className="admin-field"><span>Series</span><input className="input" value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))} /></label>
            <label className="admin-field"><span>Series Code</span><input className="input" value={form.series_code} onChange={e => setForm(f => ({ ...f, series_code: e.target.value }))} /></label>

            <label className="admin-field"><span>Price (₹) *</span><input className="input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></label>
            <label className="admin-field"><span>Original Price (₹)</span><input className="input" type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} /></label>
            <label className="admin-field"><span>Stock</span><input className="input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></label>
            <label className="admin-field"><span>SKU</span><input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></label>

            <label className="admin-field"><span>Player Level</span>
              <select className="select" value={form.player_level} onChange={e => setForm(f => ({ ...f, player_level: e.target.value }))}>
                <option value="">—</option>{PRODUCT_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="admin-field"><span>Playing Style</span>
              <select className="select" value={form.playing_style} onChange={e => setForm(f => ({ ...f, playing_style: e.target.value }))}>
                <option value="">—</option>{PRODUCT_STYLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="admin-field"><span>Balance</span>
              <select className="select" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}>
                <option value="">—</option>{PRODUCT_BALANCE.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="admin-field"><span>Flex</span>
              <select className="select" value={form.flex} onChange={e => setForm(f => ({ ...f, flex: e.target.value }))}>
                <option value="">—</option>{PRODUCT_FLEX.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="admin-field"><span>Weight</span><input className="input" value={form.weight_spec} onChange={e => setForm(f => ({ ...f, weight_spec: e.target.value }))} /></label>
            <label className="admin-field"><span>Frame Material</span><input className="input" value={form.frame_material} onChange={e => setForm(f => ({ ...f, frame_material: e.target.value }))} /></label>
            <label className="admin-field"><span>Shaft Material</span><input className="input" value={form.shaft_material} onChange={e => setForm(f => ({ ...f, shaft_material: e.target.value }))} /></label>
            <label className="admin-field"><span>Max Tension</span><input className="input" value={form.max_tension} onChange={e => setForm(f => ({ ...f, max_tension: e.target.value }))} /></label>
            <label className="admin-field"><span>Recommended String</span><input className="input" value={form.recommended_string} onChange={e => setForm(f => ({ ...f, recommended_string: e.target.value }))} /></label>
            <label className="admin-field"><span>Warranty</span><input className="input" value={form.warranty} onChange={e => setForm(f => ({ ...f, warranty: e.target.value }))} /></label>

            <label className="admin-field admin-field-wide"><span>Description</span><textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
            <label className="admin-field"><span>Badge</span>
              <select className="select" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
                {PRODUCT_BADGES.map(v => <option key={v} value={v}>{v || '—'}</option>)}
              </select>
            </label>
            <label className="admin-field"><span>Colors (comma separated)</span><input className="input" value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))} /></label>
            <label className="admin-field"><span>Tags (comma separated)</span><input className="input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></label>
            <label className="admin-field"><span>In Box (comma separated)</span><input className="input" value={form.in_box} onChange={e => setForm(f => ({ ...f, in_box: e.target.value }))} /></label>
            <label className="admin-field"><span>Technologies (comma separated)</span><input className="input" value={form.technologies} onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))} /></label>
            <label className="admin-field admin-field-wide"><span>Specs (JSON)</span><textarea className="input" rows={4} style={{ fontFamily: 'var(--fm)', fontSize: 12 }} value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))} /></label>

            <label className="admin-field"><span>Meta Title</span><input className="input" value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} /></label>
            <label className="admin-field"><span>Meta Description</span><input className="input" value={form.meta_desc} onChange={e => setForm(f => ({ ...f, meta_desc: e.target.value }))} /></label>
            <label className="admin-field"><span>Sort Order</span><input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></label>

            <div className="admin-field-wide" style={{ display: 'flex', gap: 24, marginTop: 4 }}>
              <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
              <Toggle checked={form.is_best_seller} onChange={v => setForm(f => ({ ...f, is_best_seller: v }))} label="Best Seller" />
              <Toggle checked={form.is_new_arrival} onChange={v => setForm(f => ({ ...f, is_new_arrival: v }))} label="New Arrival" />
              <Toggle checked={form.is_featured} onChange={v => setForm(f => ({ ...f, is_featured: v }))} label="Featured" />
            </div>
          </div>

          {editing.id && <AdminImagesPanel productId={editing.id} />}
          {editing.id && <AdminVariantsPanel productId={editing.id} />}

          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function emptyVariantForm() { return { name: 'Size', value: '', stock: 0, isActive: true }; }

function AdminImagesPanel({ productId }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    fetchImagesForProduct(productId).then(({ data }) => { setImages(data); setLoading(false); });
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { error } = await uploadProductImage(productId, file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!error) load();
    else window.alert(error.message || 'Upload failed');
  }

  async function handleSetPrimary(imageId) {
    setBusyId(imageId);
    await setPrimaryImage(productId, imageId);
    await load();
    setBusyId(null);
  }

  async function handleDelete(image) {
    if (!window.confirm('Remove this image?')) return;
    setBusyId(image.id);
    await deleteProductImage(image.id, image.storage_path);
    await load();
    setBusyId(null);
  }

  async function handleMove(image, direction) {
    const idx = images.findIndex(i => i.id === image.id);
    const swapWith = images[idx + direction];
    if (!swapWith) return;
    setBusyId(image.id);
    await Promise.all([
      reorderProductImage(image.id, swapWith.sort_order ?? idx + direction),
      reorderProductImage(swapWith.id, image.sort_order ?? idx),
    ]);
    await load();
    setBusyId(null);
  }

  return (
    <div className="admin-images-panel" style={{ marginBottom: 24 }}>
      <div className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>Images</div>
      {loading ? (
        <p className="admin-muted t-small">Loading images…</p>
      ) : (
        <>
          {images.length > 0 && (
            <div className="admin-images-grid">
              {images.map((img, i) => (
                <div key={img.id} className="admin-image-tile">
                  <img src={img.url} alt="" />
                  {img.is_primary && <span className="admin-image-primary-badge">Primary</span>}
                  <div className="admin-image-tile-actions">
                    {!img.is_primary && (
                      <button type="button" onClick={() => handleSetPrimary(img.id)} disabled={busyId === img.id} title="Set as primary">★</button>
                    )}
                    <button type="button" onClick={() => handleMove(img, -1)} disabled={busyId === img.id || i === 0} title="Move earlier">←</button>
                    <button type="button" onClick={() => handleMove(img, 1)} disabled={busyId === img.id || i === images.length - 1} title="Move later">→</button>
                    <button type="button" onClick={() => handleDelete(img)} disabled={busyId === img.id} title="Delete" className="admin-image-tile-delete">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} style={{ display: 'none' }} id={`img-upload-${productId}`} />
            <label htmlFor={`img-upload-${productId}`} className="btn btn-outline btn-sm" style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? .6 : 1 }}>
              {uploading ? 'Uploading…' : '+ Upload Image'}
            </label>
          </div>
        </>
      )}
      <style>{`
        .admin-images-grid { display:flex; flex-wrap:wrap; gap:10px; }
        .admin-image-tile { position:relative; width:88px; height:88px; border-radius:var(--r-sm); overflow:hidden; border:1px solid var(--gr-5); background:var(--gr-6); }
        .admin-image-tile img { width:100%; height:100%; object-fit:contain; }
        .admin-image-primary-badge { position:absolute; top:4px; left:4px; background:var(--bk); color:var(--wh); font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; letter-spacing:.04em; }
        .admin-image-tile-actions { position:absolute; inset:0; display:flex; align-items:flex-end; justify-content:center; gap:3px; padding:4px; opacity:0; transition:opacity .15s; background:linear-gradient(transparent 40%, rgba(0,0,0,.55)); }
        .admin-image-tile:hover .admin-image-tile-actions { opacity:1; }
        .admin-image-tile-actions button { width:22px; height:22px; border-radius:4px; background:rgba(255,255,255,.9); font-size:11px; line-height:1; }
        .admin-image-tile-actions button:hover { background:var(--wh); }
        .admin-image-tile-delete { color:#dc2626; font-weight:700; }
      `}</style>
    </div>
  );
}

function AdminVariantsPanel({ productId }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyVariantForm());
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(() => {
    fetchVariantsForProduct(productId).then(({ data }) => { setVariants(data); setLoading(false); });
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!form.value.trim()) return;
    setAdding(true);
    const { error } = await createVariant(productId, {
      name: form.name.trim() || 'Size',
      value: form.value.trim(),
      stock: Number(form.stock) || 0,
      isActive: form.isActive,
    });
    setAdding(false);
    if (!error) { setForm(emptyVariantForm()); load(); }
  }

  async function handleStockChange(variant, stock) {
    setSavingId(variant.id);
    setVariants(list => list.map(v => v.id === variant.id ? { ...v, stock } : v));
    await updateVariant(variant.id, { stock });
    setSavingId(null);
  }

  async function handleToggleActive(variant) {
    setVariants(list => list.map(v => v.id === variant.id ? { ...v, is_active: !v.is_active } : v));
    await updateVariant(variant.id, { is_active: !variant.is_active });
  }

  async function handleDelete(variant) {
    if (!window.confirm(`Remove "${variant.value}"? This cannot be undone.`)) return;
    setVariants(list => list.filter(v => v.id !== variant.id));
    await deleteVariant(variant.id);
  }

  return (
    <div className="admin-variants-panel">
      <div className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>Variants (e.g. Sizes)</div>
      {loading ? (
        <p className="admin-muted t-small">Loading variants…</p>
      ) : (
        <>
          {variants.length > 0 && (
            <div className="admin-variants-list">
              {variants.map(v => (
                <div key={v.id} className="admin-variant-row">
                  <span className="admin-variant-label">{v.name}: <strong>{v.value}</strong></span>
                  <input
                    className="input admin-variant-stock-input"
                    type="number"
                    min={0}
                    value={v.stock}
                    disabled={savingId === v.id}
                    onChange={e => handleStockChange(v, Math.max(0, Number(e.target.value)))}
                  />
                  <span className="admin-muted t-small">in stock</span>
                  <Toggle checked={v.is_active} onChange={() => handleToggleActive(v)} label="Active" />
                  <button className="admin-variant-remove" onClick={() => handleDelete(v)} aria-label="Remove variant">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="admin-variant-add-row">
            <input className="input" placeholder="Name (e.g. Size)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ maxWidth: 120 }} />
            <input className="input" placeholder="Value (e.g. UK8)" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={{ maxWidth: 120 }} />
            <input className="input" type="number" min={0} placeholder="Stock" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={{ maxWidth: 90 }} />
            <button className="btn btn-outline btn-sm" onClick={handleAdd} disabled={adding}>{adding ? 'Adding…' : '+ Add Variant'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function ProductRow({ product: p, selected, onSelect, onToggleField, pendingActive, pendingBest, pendingNew, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <motion.div className="apc-row" layout="position" initial={false}>
      <label className="apc-checkbox-label apc-row-check">
        <input type="checkbox" checked={selected} onChange={onSelect} />
      </label>

      <div className="admin-thumb apc-row-thumb">
        {p.product_images?.[0]?.url && <img src={p.product_images[0].url} alt="" />}
      </div>

      <div className="apc-row-info">
        <div className="apc-row-name">{p.name}</div>
        <div className="apc-row-meta">
          {p.brand && <span>{p.brand}</span>}
          {p.sku && <span className="apc-row-sku">SKU {p.sku}</span>}
        </div>
      </div>

      <div className="apc-row-price">{formatPrice(p.price)}</div>
      <div className={`apc-row-stock ${p.stock < 10 ? 'admin-warn-text' : ''}`}>{p.stock} in stock</div>

      <div className="apc-row-actions">
        <div className="apc-action-group">
          <span className="apc-action-group-label">Visibility</span>
          <Toggle checked={p.is_active} onChange={() => onToggleField('is_active')} pending={pendingActive} label="Active" />
        </div>
        <div className="apc-action-group">
          <span className="apc-action-group-label">Tags</span>
          <div className="apc-action-group-row">
            <Toggle checked={p.is_best_seller} onChange={() => onToggleField('is_best_seller')} pending={pendingBest} label="Best Seller" />
            <Toggle checked={p.is_new_arrival} onChange={() => onToggleField('is_new_arrival')} pending={pendingNew} label="New" />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onEdit}>Edit</button>
        <div className="apc-row-menu" ref={menuRef}>
          <button className="apc-row-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More actions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="apc-row-menu-popover"
                initial={{ opacity: 0, scale: .96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: .96, y: -4 }}
                transition={{ duration: .15 }}
              >
                <button className="apc-row-menu-item apc-row-menu-danger" onClick={() => { setMenuOpen(false); onDelete(); }}>Delete Product</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
