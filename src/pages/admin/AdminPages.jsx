// ── Admin Pages: Products, Categories, Orders, Customers, Newsletter, Settings, Content ──
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../../utils/format';
import {
  fetchAllProductsAdmin, createProduct, updateProduct, deleteProduct,
  fetchImagesForProduct, uploadProductImage, deleteProductImage, setPrimaryImage, reorderProductImage,
} from '../../lib/api/products';
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
} from '../../lib/api/categories';
import {
  fetchAllOrders, updateOrderStatus,
} from '../../lib/api/orders';
import { fetchAllCustomers } from '../../lib/api/customers';
import {
  fetchNewsletterSubscribers, fetchSiteSettings, updateSiteSettings,
} from '../../lib/api/admin';
import {
  fetchAllContent, updateContent, fetchFaqs, createFaq, updateFaq, deleteFaq,
} from '../../lib/api/content';
import { listMedia, uploadMedia, replaceMedia, deleteMedia } from '../../lib/api/media';
import {
  fetchShipmentByOrderId, createShipment, updateShipment, markShipmentStatus, cancelShipment, logShipmentEvent,
} from '../../lib/api/shipments';
import {
  fetchVariantsForProduct, createVariant, updateVariant, deleteVariant,
} from '../../lib/api/variants';

// ── Shared small pieces ─────────────────────────────────────────────

function Toggle({ checked, onChange, label, pending }) {
  return (
    <label className={`admin-toggle ${pending ? 'admin-toggle-pending' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={!!pending} onChange={e => onChange(e.target.checked)} />
      <span className="admin-toggle-track">
        <span className="admin-toggle-thumb" />
        {pending && <span className="admin-toggle-spinner" />}
      </span>
      {label && <span className="admin-toggle-label">{label}</span>}
    </label>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-card-title">{title}</h2>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

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

// ═══════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════

function emptyCategoryForm() {
  return { name: '', slug: '', description: '', sort_order: 0, is_active: true };
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategoryForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchCategories().then(({ data }) => { setCategories(data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

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

      <div className="admin-card">
        {loading ? (
          <div className="admin-page-loading">Loading categories…</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Sort</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="admin-muted">{c.slug}</td>
                  <td className="admin-muted">{c.sort_order}</td>
                  <td><Toggle checked={c.is_active} onChange={async v => { await updateCategory(c.id, { is_active: v }); load(); }} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={5} className="admin-muted" style={{ textAlign: 'center', padding: 32 }}>No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Category'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280',
};
const PAYMENT_STATUS_COLORS = {
  pending: '#f59e0b', paid: '#10b981', failed: '#ef4444', refunded: '#6b7280',
};
const ORDER_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'amount-desc', label: 'Amount: High to Low' },
  { value: 'amount-asc', label: 'Amount: Low to High' },
];

function StatusPill({ value, colors }) {
  const color = colors[value] || '#6b7280';
  return <span className="aor-pill" style={{ background: color + '1a', color }}>{value}</span>;
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [pending, setPending] = useState(() => new Set());
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);

  const load = useCallback(() => {
    fetchAllOrders({ status: statusFilter || undefined, limit: 150 }).then(({ data }) => { setOrders(data); setLoading(false); });
  }, [statusFilter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function handleStatusChange(order, status) {
    setPending(s => new Set(s).add(order.id));
    setOrders(list => list.map(o => o.id === order.id ? { ...o, status } : o));
    const { error } = await updateOrderStatus(order.id, status);
    setPending(s => { const n = new Set(s); n.delete(order.id); return n; });
    if (error) setOrders(list => list.map(o => o.id === order.id ? { ...o, status: order.status } : o));
  }

  const filtered = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customers?.full_name?.toLowerCase().includes(q) ||
        o.customers?.email?.toLowerCase().includes(q)
      );
    }
    if (paymentFilter) list = list.filter(o => o.payment_status === paymentFilter);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'amount-desc': return b.total - a.total;
        case 'amount-asc': return a.total - b.total;
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [orders, search, paymentFilter, sort]);

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Orders</h1>
          <p className="apc-subtitle">Track fulfillment, payment status, and order history.</p>
        </div>
        <div className="apc-header-right">
          <span className="admin-muted t-small">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="apc-filters-section">
        <div className="apc-filters">
          <input className="input apc-search" placeholder="Search order #, customer name, or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Fulfillment</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
            <option value="">All Payments</option>
            {Object.keys(PAYMENT_STATUS_COLORS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {ORDER_SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="admin-muted">No orders found.</p>
        </div>
      ) : (
        <div className="aor-list">
          {filtered.map(o => (
            <motion.div key={o.id} className="aor-row" layout="position" initial={false}>
              <div className="aor-cell aor-cell-number">
                <Link to={`/admin/orders/${o.id}`} className="admin-link aor-order-number">{o.order_number || o.id.slice(0, 8)}</Link>
                <span className="admin-muted t-small">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>

              <div className="aor-cell">
                <div className="aor-customer-name">{o.customers?.full_name || '—'}</div>
                <div className="admin-muted t-small">{o.customers?.email || ''}</div>
              </div>

              <div className="aor-cell aor-cell-center">
                <span className="admin-muted t-small">{o.order_items?.length ?? 0} item{(o.order_items?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>

              <div className="aor-cell aor-cell-center aor-amount">{formatPrice((o.total || 0) / 100)}</div>

              <div className="aor-cell aor-cell-center">
                <StatusPill value={o.payment_status} colors={PAYMENT_STATUS_COLORS} />
              </div>

              <div className="aor-cell aor-cell-center">
                <select
                  className="select aor-status-select"
                  value={o.status}
                  disabled={pending.has(o.id)}
                  onChange={e => handleStatusChange(o, e.target.value)}
                  style={{ background: (STATUS_COLORS[o.status] || '#999') + '1a', color: STATUS_COLORS[o.status] || '#666' }}
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="aor-cell aor-cell-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setPaymentModalOrder(o)}>Payment</button>
                <Link to={`/admin/orders/${o.id}`} className="btn btn-primary btn-sm">View</Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {paymentModalOrder && (
        <PaymentDetailModal order={paymentModalOrder} onClose={() => setPaymentModalOrder(null)} />
      )}
    </div>
  );
}

function PaymentDetailModal({ order, onClose }) {
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Modal title={`Payment — ${order.order_number || order.id.slice(0, 8)}`} onClose={onClose}>
      {!payment ? (
        <p className="admin-muted">No payment record found for this order yet.</p>
      ) : (
        <>
          <div className="admin-detail-grid">
            <div><span className="admin-muted t-small">Provider</span><div style={{ textTransform: 'capitalize' }}>{payment.provider}</div></div>
            <div><span className="admin-muted t-small">Payment Method</span><div style={{ textTransform: 'capitalize' }}>{payment.payment_method || '—'}</div></div>
            <div><span className="admin-muted t-small">Payment ID</span><div style={{ fontFamily: 'monospace', fontSize: 12 }}>{payment.provider_payment_id || '—'}</div></div>
            <div><span className="admin-muted t-small">Razorpay Order ID</span><div style={{ fontFamily: 'monospace', fontSize: 12 }}>{payment.provider_order_id || '—'}</div></div>
            <div><span className="admin-muted t-small">Verification Status</span><div>{payment.signature_verified ? '✓ Verified' : '✗ Not verified'}</div></div>
            <div><span className="admin-muted t-small">Amount Paid</span><div>{formatPrice((payment.amount || 0) / 100)}</div></div>
            <div><span className="admin-muted t-small">Payment Date</span><div>{payment.captured_at ? new Date(payment.captured_at).toLocaleString('en-IN') : '—'}</div></div>
            <div><span className="admin-muted t-small">Refund Status</span><div style={{ textTransform: 'capitalize' }}>{payment.status === 'refunded' || payment.status === 'partially_refunded' ? payment.status.replace('_', ' ') : 'None'}</div></div>
            {shipment && <div><span className="admin-muted t-small">Shipment Status</span><div style={{ textTransform: 'capitalize' }}>{shipment.status}</div></div>}
          </div>

          <button className="admin-link t-small" style={{ marginTop: 20 }} onClick={() => setShowRaw(s => !s)}>
            {showRaw ? 'Hide Raw Payment Response' : 'View Raw Payment Response'}
          </button>
          {showRaw && (
            <pre style={{ marginTop: 12, padding: 16, background: '#1a1a1a', color: '#e5e5e5', fontSize: 11, lineHeight: 1.6, borderRadius: 6, overflowX: 'auto', maxHeight: 300 }}>
              {JSON.stringify(payment.raw_response, null, 2)}
            </pre>
          )}
        </>
      )}
    </Modal>
  );
}

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAllOrders({ limit: 200 }).then(({ data }) => {
      setOrder(data.find(o => o.id === id) || null);
      setLoading(false);
    });
  }, [id]);

  async function handleStatusChange(status) {
    await updateOrderStatus(id, status);
    setOrder(o => ({ ...o, status }));
  }

  if (loading) return <div className="admin-page"><div className="admin-page-loading">Loading order…</div></div>;
  if (!order) return (
    <div className="admin-page">
      <p className="admin-muted">Order not found.</p>
      <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => nav('/admin/orders')}>Back to Orders</button>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Order {order.order_number || order.id.slice(0, 8)}</h1>
          <p className="apc-subtitle">Placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="apc-header-right">
          <Link to="/admin/orders" className="btn btn-outline btn-sm">Back to Orders</Link>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="admin-detail-grid">
          <div><span className="admin-muted t-small">Customer</span><div>{order.customers?.full_name || order.customers?.email || '—'}</div></div>
          <div><span className="admin-muted t-small">Placed</span><div>{new Date(order.created_at).toLocaleString('en-IN')}</div></div>
          <div><span className="admin-muted t-small">Payment</span><div style={{ marginTop: 4 }}><StatusPill value={order.payment_status} colors={PAYMENT_STATUS_COLORS} />{order.payment_id && <span className="admin-muted t-small" style={{ marginLeft: 8 }}>{order.payment_id}</span>}</div></div>
          <div>
            <span className="admin-muted t-small">Fulfillment</span>
            <div style={{ marginTop: 4 }}>
              <select
                className="select aor-status-select"
                value={order.status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{ background: (STATUS_COLORS[order.status] || '#999') + '1a', color: STATUS_COLORS[order.status] || '#666' }}
              >
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2 className="admin-card-title">Items</h2></div>
        <table className="admin-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
          <tbody>
            {(order.order_items || []).map(i => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="admin-muted">{i.qty}</td>
                <td>{formatPrice(i.price)}</td>
                <td>{formatPrice(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-order-totals">
          <div><span>Subtotal</span><span>{formatPrice(order.subtotal / 100)}</span></div>
          <div><span>Tax</span><span>{formatPrice(order.tax / 100)}</span></div>
          <div><span>Shipping</span><span>{formatPrice(order.shipping_cost / 100)}</span></div>
          <div className="admin-order-total-final"><span>Total</span><span>{formatPrice(order.total / 100)}</span></div>
        </div>
      </div>

      {order.shipping_address && (
        <div className="admin-card" style={{ marginTop: 20, padding: 24 }}>
          <h2 className="admin-card-title" style={{ marginBottom: 12 }}>Shipping Address</h2>
          <div className="admin-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
            {order.shipping_address.firstName} {order.shipping_address.lastName}<br />
            {order.shipping_address.address1}{order.shipping_address.address2 ? `, ${order.shipping_address.address2}` : ''}<br />
            {order.shipping_address.city} {order.shipping_address.postcode}<br />
            {order.shipping_address.country}<br />
            {order.shipping_address.phone}
          </div>
        </div>
      )}

      <AdminShipmentPanel orderId={order.id} />
    </div>
  );
}

const SHIPMENT_STATUS_COLORS = {
  pending: '#f59e0b', packed: '#3b82f6', shipped: '#8b5cf6',
  in_transit: '#0ea5e9', delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280',
};

function AdminShipmentPanel({ orderId }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ courier_name: '', tracking_number: '', tracking_url: '', estimated_delivery: '', label_url: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ description: '', location: '' });

  const load = useCallback(() => {
    fetchShipmentByOrderId(orderId).then(({ data }) => {
      setShipment(data);
      if (data) {
        setForm({
          courier_name: data.courier_name || '', tracking_number: data.tracking_number || '',
          tracking_url: data.tracking_url || '', estimated_delivery: data.estimated_delivery ? data.estimated_delivery.slice(0, 10) : '',
          label_url: data.label_url || '', notes: data.notes || '',
        });
      }
      setLoading(false);
    });
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setSaving(true);
    await createShipment(orderId, {});
    setSaving(false);
    load();
  }

  async function handleSaveDetails() {
    setSaving(true);
    await updateShipment(shipment.id, {
      courier_name: form.courier_name || null,
      tracking_number: form.tracking_number || null,
      tracking_url: form.tracking_url || null,
      estimated_delivery: form.estimated_delivery || null,
      label_url: form.label_url || null,
      notes: form.notes || null,
    });
    setSaving(false);
    load();
  }

  async function handleStatus(status) {
    await markShipmentStatus(shipment.id, status);
    load();
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this shipment?')) return;
    await cancelShipment(shipment.id);
    load();
  }

  async function handleAddEvent() {
    if (!eventForm.description.trim()) return;
    await logShipmentEvent(shipment.id, 'note', eventForm.description, eventForm.location || null);
    setEventForm({ description: '', location: '' });
    load();
  }

  if (loading) return <div className="admin-card" style={{ marginTop: 20, padding: 24 }}><p className="admin-muted">Loading shipment…</p></div>;

  if (!shipment) {
    return (
      <div className="admin-card" style={{ marginTop: 20, padding: 24, textAlign: 'center' }}>
        <p className="admin-muted" style={{ marginBottom: 12 }}>No shipment created for this order yet.</p>
        <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : '+ Create Shipment'}</button>
      </div>
    );
  }

  return (
    <div className="admin-card" style={{ marginTop: 20, padding: 24 }}>
      <div className="admin-card-header" style={{ padding: 0, marginBottom: 18, border: 'none' }}>
        <h2 className="admin-card-title">Shipment</h2>
        <StatusPill value={shipment.shipment_status} colors={SHIPMENT_STATUS_COLORS} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('packed')} disabled={shipment.shipment_status === 'cancelled'}>Mark Packed</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('shipped')} disabled={shipment.shipment_status === 'cancelled'}>Mark Shipped</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('in_transit')} disabled={shipment.shipment_status === 'cancelled'}>Mark In Transit</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('delivered')} disabled={shipment.shipment_status === 'cancelled'}>Mark Delivered</button>
        <button className="btn btn-outline btn-sm admin-btn-danger" onClick={handleCancel} disabled={shipment.shipment_status === 'cancelled'}>Cancel Shipment</button>
      </div>

      <div className="admin-form-grid" style={{ marginBottom: 16 }}>
        <label className="admin-field"><span>Courier</span><input className="input" value={form.courier_name} onChange={e => setForm(f => ({ ...f, courier_name: e.target.value }))} /></label>
        <label className="admin-field"><span>Tracking Number</span><input className="input" value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} /></label>
        <label className="admin-field"><span>Tracking URL</span><input className="input" value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))} /></label>
        <label className="admin-field"><span>Estimated Delivery</span><input className="input" type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} /></label>
        <label className="admin-field"><span>Label URL</span><input className="input" value={form.label_url} onChange={e => setForm(f => ({ ...f, label_url: e.target.value }))} /></label>
        <label className="admin-field admin-field-wide"><span>Notes</span><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleSaveDetails} disabled={saving} style={{ marginBottom: 24 }}>{saving ? 'Saving…' : 'Save Shipment Details'}</button>

      <h3 className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>Timeline</h3>
      <div className="ash-timeline">
        {(shipment.shipment_events || []).map(ev => (
          <div key={ev.id} className="ash-timeline-item">
            <div className="ash-timeline-dot" style={{ background: SHIPMENT_STATUS_COLORS[ev.event_type] || 'var(--gr-3)' }} />
            <div>
              <div className="ash-timeline-desc">{ev.description}</div>
              <div className="admin-muted t-small">{new Date(ev.occurred_at).toLocaleString('en-IN')}{ev.location ? ` · ${ev.location}` : ''}</div>
            </div>
          </div>
        ))}
        {(!shipment.shipment_events || shipment.shipment_events.length === 0) && <p className="admin-muted t-small">No events yet.</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input className="input" placeholder="Add a note (e.g. 'Left with security')" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} style={{ flex: 2 }} />
        <input className="input" placeholder="Location (optional)" value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={handleAddEvent}>Add</button>
      </div>
      <style>{`
        .ash-timeline { display:flex; flex-direction:column; gap:14px; }
        .ash-timeline-item { display:flex; gap:12px; align-items:flex-start; }
        .ash-timeline-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .ash-timeline-desc { font-size:13px; font-weight:500; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function customerStatus(c) {
  if (c.order_count === 0) return { label: 'New', color: '#3b82f6' };
  if (c.order_count >= 5) return { label: 'VIP', color: '#a855f7' };
  return { label: 'Active', color: '#16a34a' };
}

const CUSTOMER_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'spend-desc', label: 'Lifetime Spend' },
  { value: 'orders-desc', label: 'Most Orders' },
  { value: 'name-asc', label: 'Alphabetical' },
];

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllCustomers({ search: search || undefined, limit: 200 }).then(({ data }) => { setCustomers(data); setLoading(false); });
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = customers;
    if (statusFilter) list = list.filter(c => customerStatus(c).label.toLowerCase() === statusFilter);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'spend-desc': return b.lifetime_spend - a.lifetime_spend;
        case 'orders-desc': return b.order_count - a.order_count;
        case 'name-asc': return (a.full_name || a.email).localeCompare(b.full_name || b.email);
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [customers, statusFilter, sort]);

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="apc-subtitle">View customer profiles, order history, and lifetime value.</p>
        </div>
        <div className="apc-header-right">
          <span className="admin-muted t-small">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="apc-filters-section">
        <div className="apc-filters">
          <input className="input apc-search" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="vip">VIP</option>
          </select>
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {CUSTOMER_SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="admin-muted">No customers found.</p>
        </div>
      ) : (
        <div className="acu-list">
          {filtered.map(c => {
            const status = customerStatus(c);
            return (
              <motion.div key={c.id} className="acu-card" layout="position" initial={false}>
                <div className="acu-avatar">{initials(c.full_name, c.email)}</div>

                <div className="acu-info">
                  <div className="acu-name">{c.full_name || 'Unnamed Customer'}</div>
                  <div className="acu-meta">
                    <span>{c.email}</span>
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                </div>

                <div className="acu-stat">
                  <span className="acu-stat-label">Orders</span>
                  <span className="acu-stat-value">{c.order_count}</span>
                </div>
                <div className="acu-stat">
                  <span className="acu-stat-label">Lifetime Spend</span>
                  <span className="acu-stat-value">{formatPrice((c.lifetime_spend || 0) / 100)}</span>
                </div>
                <div className="acu-stat">
                  <span className="acu-stat-label">Last Order</span>
                  <span className="acu-stat-value acu-stat-muted">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-IN') : '—'}</span>
                </div>
                <div className="acu-stat">
                  <span className="acu-stat-label">Joined</span>
                  <span className="acu-stat-value acu-stat-muted">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                </div>

                <div className="acu-status-pill" style={{ background: status.color + '1a', color: status.color }}>{status.label}</div>

                <button className="btn btn-outline btn-sm" onClick={() => setSelected(c)}>View</button>
              </motion.div>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal title={selected.full_name || selected.email} onClose={() => setSelected(null)}>
          <div className="admin-detail-grid">
            <div><span className="admin-muted t-small">Email</span><div>{selected.email}</div></div>
            <div><span className="admin-muted t-small">Phone</span><div>{selected.phone || '—'}</div></div>
            <div><span className="admin-muted t-small">Orders</span><div>{selected.order_count ?? 0}</div></div>
            <div><span className="admin-muted t-small">Lifetime Spend</span><div>{formatPrice((selected.lifetime_spend || 0) / 100)}</div></div>
            <div><span className="admin-muted t-small">Last Order</span><div>{selected.last_order_at ? new Date(selected.last_order_at).toLocaleDateString('en-IN') : '—'}</div></div>
            <div><span className="admin-muted t-small">Customer since</span><div>{new Date(selected.created_at).toLocaleDateString('en-IN')}</div></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEWSLETTER
// ═══════════════════════════════════════════════════════════════════

export function AdminNewsletterPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsletterSubscribers({ limit: 200 }).then(({ data }) => { setSubs(data); setLoading(false); });
  }, []);

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Newsletter</h1>
          <p className="apc-subtitle">See who's subscribed for updates and launches.</p>
        </div>
        <div className="apc-header-right">
          <span className="admin-muted t-small">{subs.length} subscriber{subs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="admin-card">
        {loading ? (
          <div className="admin-page-loading">Loading subscribers…</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td className="admin-muted">{new Date(s.subscribed_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={2} className="admin-muted" style={{ textAlign: 'center', padding: 32 }}>No subscribers yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════

const SETTINGS_GROUPS = [
  {
    title: 'Brand',
    fields: [
      ['company_name', 'Brand Name', 'text'],
      ['tagline', 'Tagline', 'text'],
      ['primary_color', 'Primary Color', 'color'],
      ['secondary_color', 'Secondary Color', 'color'],
    ],
  },
  {
    title: 'Contact & Social',
    fields: [
      ['email', 'Support Email', 'text'], ['phone', 'Phone', 'text'], ['whatsapp', 'WhatsApp', 'text'],
      ['address', 'Address', 'text'],
      ['instagram_url', 'Instagram', 'text'], ['facebook_url', 'Facebook', 'text'],
      ['youtube_url', 'YouTube', 'text'], ['twitter_url', 'Twitter', 'text'],
    ],
  },
  {
    title: 'SEO & Analytics',
    fields: [
      ['meta_title', 'SEO Title', 'text'], ['meta_description', 'SEO Description', 'text'],
      ['analytics_id', 'Google Analytics ID', 'text'], ['meta_pixel_id', 'Meta Pixel ID', 'text'],
    ],
  },
  {
    title: 'Policies',
    fields: [
      ['shipping_policy', 'Shipping Policy', 'textarea'], ['return_policy', 'Return Policy', 'textarea'],
      ['privacy_policy', 'Privacy Policy', 'textarea'], ['terms', 'Terms & Conditions', 'textarea'],
    ],
  },
];

export function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchSiteSettings().then(({ data }) => { setForm(data || {}); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    setFormError('');
    setSaved(false);
    const { error } = await updateSiteSettings(form);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save settings.'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="admin-page"><div className="admin-page-loading">Loading settings…</div></div>;

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Settings</h1>
          <p className="apc-subtitle">Brand identity, contact details, and storefront configuration.</p>
        </div>
        <div className="apc-header-right">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}</button>
        </div>
      </div>

      <div className="acm-sections">
        {SETTINGS_GROUPS.map(group => (
          <div key={group.title} className="admin-card" style={{ padding: 24 }}>
            <h2 className="admin-card-title" style={{ marginBottom: 18 }}>{group.title}</h2>
            <div className="admin-form-grid">
              {group.fields.map(([key, label, type]) => (
                <label key={key} className={`admin-field ${type === 'textarea' ? 'admin-field-wide' : ''}`}>
                  <span>{label}</span>
                  {type === 'textarea' ? (
                    <textarea className="input" rows={4} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  ) : type === 'color' ? (
                    <div className="admin-color-input">
                      <input type="color" value={form[key] || '#000000'} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ) : (
                    <input className="input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {formError && <p className="admin-form-error">{formError}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONTENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const CONTENT_SECTIONS = [
  {
    title: 'Homepage',
    source: 'content',
    fields: [
      ['homepage.hero_title', 'Hero Title', 'input'],
      ['homepage.hero_subtitle', 'Hero Subtitle', 'textarea'],
      ['homepage.hero_cta', 'Hero CTA Button Text', 'input'],
      ['homepage.brand_story_title', 'Brand Story Title', 'input'],
      ['homepage.brand_story_body', 'Brand Story Body', 'textarea'],
    ],
  },
  {
    title: 'About',
    source: 'content',
    fields: [
      ['about.mission', 'Mission', 'textarea'],
      ['about.vision', 'Vision', 'textarea'],
      ['about.story', 'Story', 'textarea'],
    ],
  },
  {
    title: 'Footer',
    source: 'content',
    fields: [
      ['footer.text', 'Footer Description', 'textarea'],
      ['footer.copyright', 'Copyright Line', 'input'],
    ],
  },
  {
    title: 'Newsletter',
    source: 'content',
    fields: [
      ['homepage.newsletter_title', 'Newsletter Section Title', 'input'],
      ['homepage.newsletter_body', 'Newsletter Section Body', 'textarea'],
    ],
  },
  {
    title: 'Legal',
    source: 'content',
    fields: [
      ['legal.privacy_policy', 'Privacy Policy (Markdown)', 'textarea'],
      ['legal.terms_conditions', 'Terms & Conditions (Markdown)', 'textarea'],
    ],
  },
];

function ContentPreview({ section, values }) {
  if (section.title === 'Homepage') {
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Preview — Hero</div>
        <div className="acm-preview-hero-title">{values['homepage.hero_title'] || 'Hero Title'}</div>
        <div className="acm-preview-hero-sub">{values['homepage.hero_subtitle'] || 'Hero subtitle text'}</div>
        <span className="btn btn-primary btn-sm" style={{ marginTop: 10, display: 'inline-block' }}>{values['homepage.hero_cta'] || 'CTA'}</span>
        <div className="acm-preview-divider" />
        <div className="acm-preview-eyebrow">Preview — Brand Story</div>
        <div className="acm-preview-label">{values['homepage.brand_story_title'] || 'Brand story title'}</div>
        <p className="t-body" style={{ marginTop: 8 }}>{values['homepage.brand_story_body'] || '—'}</p>
      </div>
    );
  }
  if (section.title === 'About') {
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Preview</div>
        <div className="acm-preview-label">Mission</div>
        <p className="t-body" style={{ marginBottom: 16 }}>{values['about.mission'] || '—'}</p>
        <div className="acm-preview-label">Vision</div>
        <p className="t-body" style={{ marginBottom: 16 }}>{values['about.vision'] || '—'}</p>
        <div className="acm-preview-label">Story</div>
        <p className="t-body">{values['about.story'] || '—'}</p>
      </div>
    );
  }
  if (section.title === 'Footer') {
    return (
      <div className="acm-preview acm-preview-dark">
        <div className="acm-preview-eyebrow" style={{ color: 'rgba(255,255,255,.4)' }}>Preview</div>
        <p className="acm-footer-preview-text">{values['footer.text'] || 'Footer description text'}</p>
        <div className="acm-footer-preview-copy">{values['footer.copyright'] || `© ${new Date().getFullYear()} RacquetIn. All rights reserved.`}</div>
      </div>
    );
  }
  if (section.title === 'Newsletter') {
    return (
      <div className="acm-preview acm-preview-brand">
        <div className="acm-preview-eyebrow" style={{ color: 'rgba(255,255,255,.6)' }}>Preview</div>
        <div className="acm-newsletter-preview-title">{values['homepage.newsletter_title'] || 'Newsletter title'}</div>
        <p className="acm-newsletter-preview-body">{values['homepage.newsletter_body'] || 'Newsletter body text'}</p>
        <div className="acm-newsletter-preview-form">
          <span className="acm-newsletter-preview-input">Enter your email address</span>
          <span className="btn btn-primary btn-sm">Subscribe</span>
        </div>
      </div>
    );
  }
  if (section.title === 'Legal') {
    const privacyLen = (values['legal.privacy_policy'] || '').trim().length;
    const termsLen = (values['legal.terms_conditions'] || '').trim().length;
    return (
      <div className="acm-preview">
        <div className="acm-preview-eyebrow">Live Pages</div>
        <div className="acm-preview-label">Privacy Policy</div>
        <p className="t-small admin-muted" style={{ marginBottom: 16 }}>
          {privacyLen ? `${privacyLen.toLocaleString()} characters — published at ` : 'Not published yet — '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cr)' }}>/privacy-policy</a>
        </p>
        <div className="acm-preview-label">Terms &amp; Conditions</div>
        <p className="t-small admin-muted">
          {termsLen ? `${termsLen.toLocaleString()} characters — published at ` : 'Not published yet — '}
          <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cr)' }}>/terms-and-conditions</a>
        </p>
        <p className="admin-muted t-small" style={{ marginTop: 16 }}>Supports Markdown: # / ## headings, "- " bullets, **bold**, and [text](url) links.</p>
      </div>
    );
  }
  return null;
}

export function AdminContentPage() {
  const [tab, setTab] = useState('copy'); // copy | faq | media
  const [activeSection, setActiveSection] = useState(CONTENT_SECTIONS[0].title);
  const [content, setContent] = useState({});
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState({ content: {}, settings: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllContent(), fetchSiteSettings()]).then(([c, s]) => {
      setContent(c.data);
      setSettings(s.data || {});
      setSaved({ content: c.data, settings: s.data || {} });
      setLoading(false);
    });
  }, []);

  const section = CONTENT_SECTIONS.find(s => s.title === activeSection);
  const values = section.source === 'settings' ? settings : content;
  const setValues = section.source === 'settings' ? setSettings : setContent;

  function setField(key, value) { setValues(v => ({ ...v, [key]: value })); }

  async function handleSave() {
    setSaving(true);
    if (section.source === 'settings') {
      const entries = {};
      section.fields.forEach(([key]) => { entries[key] = settings[key] ?? ''; });
      const { error } = await updateSiteSettings(entries);
      setSaving(false);
      if (!error) {
        setSaved(s => ({ ...s, settings: { ...s.settings, ...entries } }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1600);
      }
    } else {
      const entries = {};
      section.fields.forEach(([key]) => { entries[key] = content[key] ?? ''; });
      const { error } = await updateContent(entries);
      setSaving(false);
      if (!error) {
        setSaved(s => ({ ...s, content: { ...s.content, ...entries } }));
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1600);
      }
    }
  }

  function handleReset() {
    const savedValues = section.source === 'settings' ? saved.settings : saved.content;
    setValues(v => {
      const next = { ...v };
      section.fields.forEach(([key]) => { next[key] = savedValues[key] ?? ''; });
      return next;
    });
  }

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Content Management</h1>
          <p className="apc-subtitle">Edit storefront copy, FAQ, and media without touching code.</p>
        </div>
      </div>

      <div className="acm-tabs">
        <button className={`acm-tab ${tab === 'copy' ? 'acm-tab-active' : ''}`} onClick={() => setTab('copy')}>Site Copy</button>
        <button className={`acm-tab ${tab === 'faq' ? 'acm-tab-active' : ''}`} onClick={() => setTab('faq')}>FAQ</button>
        <button className={`acm-tab ${tab === 'media' ? 'acm-tab-active' : ''}`} onClick={() => setTab('media')}>Media Library</button>
      </div>

      {tab === 'copy' && (
        loading ? <div className="admin-page-loading">Loading content…</div> : (
          <div className="acm-editor">
            <div className="acm-section-nav">
              {CONTENT_SECTIONS.map(s => (
                <button
                  key={s.title}
                  className={`acm-section-nav-item ${activeSection === s.title ? 'acm-section-nav-active' : ''}`}
                  onClick={() => setActiveSection(s.title)}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <motion.div key={activeSection} className="acm-editor-panel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
              <div className="acm-editor-header">
                <h2 className="admin-card-title">{section.title}</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {savedFlash && <span className="acm-saved-flash">Saved ✓</span>}
                  <button className="btn btn-outline btn-sm" onClick={handleReset}>Reset</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
              <div className="acm-section-body">
                <div className="acm-fields">
                  {section.fields.map(([key, label, type]) => (
                    <label key={key} className="admin-field admin-field-wide">
                      <span>{label}</span>
                      {type === 'textarea' ? (
                        <textarea
                          className="input"
                          rows={section.title === 'Legal' ? 22 : 4}
                          style={section.title === 'Legal' ? { fontFamily: 'var(--fm)', fontSize: 12.5, lineHeight: 1.6 } : undefined}
                          value={values[key] || ''}
                          onChange={e => setField(key, e.target.value)}
                        />
                      ) : (
                        <input className="input" value={values[key] || ''} onChange={e => setField(key, e.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
                <ContentPreview section={section} values={values} />
              </div>
            </motion.div>
          </div>
        )
      )}

      {tab === 'faq' && <AdminFaqPanel />}
      {tab === 'media' && <AdminMediaPanel />}
    </div>
  );
}

function emptyFaqForm() { return { question: '', answer: '', sort_order: 0, is_active: true }; }

function AdminFaqPanel() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFaqForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => { fetchFaqs().then(({ data }) => { setFaqs(data); setLoading(false); }); }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(emptyFaqForm()); setFormError(''); setEditing({}); }
  function openEdit(f) { setForm({ question: f.question, answer: f.answer, sort_order: f.sort_order ?? 0, is_active: f.is_active }); setFormError(''); setEditing(f); }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) { setFormError('Question and answer are required.'); return; }
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
    const { error } = editing.id ? await updateFaq(editing.id, payload) : await createFaq(payload);
    setSaving(false);
    if (error) { setFormError(error.message || 'Could not save FAQ.'); return; }
    setEditing(null);
    load();
  }

  async function handleDelete(f) {
    if (!window.confirm('Delete this FAQ entry?')) return;
    setFaqs(list => list.filter(x => x.id !== f.id));
    await deleteFaq(f.id);
  }

  async function toggleActive(f) {
    setFaqs(list => list.map(x => x.id === f.id ? { ...x, is_active: !x.is_active } : x));
    await updateFaq(f.id, { is_active: !f.is_active });
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">FAQ Entries</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New FAQ</button>
      </div>
      {loading ? (
        <div className="admin-page-loading">Loading FAQs…</div>
      ) : (
        <div className="apc-rows">
          {faqs.map(f => (
            <div key={f.id} className="apc-row" style={{ alignItems: 'flex-start' }}>
              <div className="apc-row-info">
                <div className="apc-row-name">{f.question}</div>
                <div className="admin-muted t-small" style={{ marginTop: 4 }}>{f.answer}</div>
              </div>
              <div className="apc-row-actions">
                <Toggle checked={f.is_active} onChange={() => toggleActive(f)} label="Active" />
                <button className="btn btn-primary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(f)}>Delete</button>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <div className="admin-muted" style={{ textAlign: 'center', padding: 32 }}>No FAQ entries yet.</div>}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit FAQ' : 'New FAQ'} onClose={() => setEditing(null)}>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide"><span>Question</span><input className="input" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} /></label>
            <label className="admin-field admin-field-wide"><span>Answer</span><textarea className="input" rows={4} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} /></label>
            <label className="admin-field"><span>Sort Order</span><input className="input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></label>
            <div className="admin-field" style={{ display: 'flex', alignItems: 'center' }}>
              <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
            </div>
          </div>
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const MEDIA_FOLDERS = [
  { prefix: 'homepage', label: 'Homepage' },
  { prefix: 'categories', label: 'Categories' },
  { prefix: 'products', label: 'Products' },
  { prefix: 'brand', label: 'Brand' },
  { prefix: 'newsletter', label: 'Newsletter' },
  { prefix: 'footer', label: 'Footer' },
  { prefix: 'logo', label: 'Logo' },
  { prefix: 'favicon', label: 'Favicon' },
];

function AdminMediaPanel() {
  const [folder, setFolder] = useState(MEDIA_FOLDERS[0].prefix);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl } awaiting confirmation
  const [replaceTarget, setReplaceTarget] = useState(null); // media item being replaced, or null for a normal new upload
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    listMedia('site-assets', folder).then(({ data }) => { setFiles(data); setLoading(false); });
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile({ file, previewUrl: URL.createObjectURL(file) });
  }

  function handlePickReplacement(e, target) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplaceTarget(target);
    setPendingFile({ file, previewUrl: URL.createObjectURL(file) });
  }

  function cancelPending() {
    if (pendingFile) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setReplaceTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    if (replaceTarget) {
      await replaceMedia('site-assets', replaceTarget.path, pendingFile.file);
    } else {
      await uploadMedia('site-assets', folder, pendingFile.file);
    }
    setUploading(false);
    cancelPending();
    load();
  }

  async function handleDelete(f) {
    if (!window.confirm(`Delete "${f.name}"?`)) return;
    setFiles(list => list.filter(x => x.path !== f.path));
    await deleteMedia('site-assets', f.path);
  }

  function copyUrl(url) {
    navigator.clipboard?.writeText(url);
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Media Library</h2>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePickFile} />
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>+ Upload Image</button>
        </div>
      </div>
      <div className="acm-media-folders">
        {MEDIA_FOLDERS.map(f => (
          <button key={f.prefix} className={`acm-folder-tab ${folder === f.prefix ? 'acm-folder-tab-active' : ''}`} onClick={() => setFolder(f.prefix)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="acm-media-grid">
        {loading ? (
          <div className="admin-page-loading">Loading media…</div>
        ) : files.length === 0 ? (
          <div className="admin-muted" style={{ padding: 32, textAlign: 'center', gridColumn: '1 / -1' }}>No images in this folder yet.</div>
        ) : (
          files.map(f => (
            <motion.div key={f.path} className="acm-media-item" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}>
              <img src={f.url} alt={f.name} />
              <div className="acm-media-item-actions">
                <button className="btn btn-outline btn-sm" onClick={() => copyUrl(f.url)}>Copy URL</button>
                <label className="btn btn-outline btn-sm acm-replace-btn">
                  Replace
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePickReplacement(e, f)} />
                </label>
                <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(f)}>Delete</button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {pendingFile && (
        <Modal title={replaceTarget ? `Replace "${replaceTarget.name}"` : 'Upload Image'} onClose={cancelPending}>
          <div className="acm-upload-preview">
            <img src={pendingFile.previewUrl} alt="Preview" />
          </div>
          <p className="admin-muted t-small" style={{ marginTop: 12 }}>
            {replaceTarget
              ? 'This will replace the existing image at the same URL — anywhere it\'s already used will update automatically.'
              : `Uploading to: ${MEDIA_FOLDERS.find(f => f.prefix === folder)?.label}`}
          </p>
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={cancelPending}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={confirmUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : replaceTarget ? 'Confirm Replace' : 'Confirm Upload'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Shared styles for all pages above — appended once via a wrapper so
// every page's JSX above stays plain (no per-page <style> duplication).
// ═══════════════════════════════════════════════════════════════════
export function AdminPagesStyles() {
  return (
    <style>{`
      .admin-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; }
      .admin-search { max-width:320px; }
      .admin-thumb { width:40px; height:40px; border-radius:var(--r-sm); background:var(--gr-6); border:1px solid var(--gr-5); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
      .admin-thumb img { width:100%; height:100%; object-fit:contain; }
      .admin-warn-text { color:#dc2626; font-weight:600; }
      .admin-btn-danger { color:#dc2626; border-color:#fca5a5; }
      .admin-btn-danger:hover { background:#fef2f2; }
      .admin-status-select { border:none; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; padding:4px 10px; border-radius:100px; cursor:pointer; }
      .admin-detail-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; font-size:13px; }
      .admin-detail-grid > div > div:last-child { margin-top:4px; font-weight:500; }
      .admin-order-totals { padding:16px 24px; border-top:1px solid var(--gr-5); font-size:13px; }
      .admin-order-totals > div { display:flex; justify-content:space-between; padding:4px 0; color:var(--gr-2); }
      .admin-order-total-final { font-weight:700; color:var(--bk); font-size:15px; border-top:1px solid var(--gr-5); margin-top:6px; padding-top:10px !important; }

      /* Toggle switch */
      .admin-toggle { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
      .admin-toggle input { position:absolute; opacity:0; width:0; height:0; }
      .admin-toggle-track { width:34px; height:19px; background:var(--gr-4); border-radius:100px; position:relative; transition:background .2s; flex-shrink:0; }
      .admin-toggle-thumb { position:absolute; top:2px; left:2px; width:15px; height:15px; background:#fff; border-radius:50%; transition:transform .2s; box-shadow:0 1px 2px rgba(0,0,0,.2); }
      .admin-toggle input:checked + .admin-toggle-track { background:var(--cr); }
      .admin-toggle input:checked + .admin-toggle-track .admin-toggle-thumb { transform:translateX(15px); }
      .admin-toggle-label { font-size:12px; color:var(--gr-1); }
      .admin-toggle-pending { opacity:.6; cursor:default; }
      .admin-toggle-spinner {
        position:absolute; inset:0; border-radius:100px;
        border:2px solid transparent; border-top-color:rgba(255,255,255,.9);
        animation: admin-spin .7s linear infinite;
      }
      @keyframes admin-spin { to { transform:rotate(360deg); } }

      /* Products page — header */
      .apc-header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:28px; }
      .apc-subtitle { font-size:13px; color:var(--gr-2); margin-top:6px; }
      .apc-header-right { display:flex; align-items:center; gap:16px; flex-shrink:0; padding-top:4px; }

      /* Filters — its own breathing section */
      .apc-filters-section { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); padding:18px 20px; margin-bottom:24px; }
      .apc-filters { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
      .apc-search { max-width:320px; flex:1; min-width:200px; }
      .apc-filters .select { width:auto; padding-right:28px; }

      /* Bulk actions bar */
      .apc-bulk-bar {
        display:flex; align-items:center; gap:8px; flex-wrap:wrap;
        background:var(--bk); color:#fff; padding:10px 16px; border-radius:var(--r);
        margin-bottom:16px; overflow:hidden;
      }
      .apc-bulk-bar .btn-outline { border-color:rgba(255,255,255,.3); color:#fff; }
      .apc-bulk-bar .btn-outline:hover { background:rgba(255,255,255,.1); }
      .apc-bulk-bar .admin-link { color:#fff; opacity:.7; }
      .apc-bulk-bar .admin-link:hover { opacity:1; }

      /* Category sections */
      .apc-categories { display:flex; flex-direction:column; gap:12px; }
      .apc-category { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); overflow:hidden; }
      .apc-category-header {
        display:flex; align-items:center; gap:12px; width:100%;
        padding:20px 24px; font-size:14px; font-weight:600; text-align:left;
      }
      .apc-chevron { transition:transform .2s; color:var(--gr-2); flex-shrink:0; }
      .apc-chevron-open { transform:rotate(90deg); }
      .apc-category-name { flex:1; }
      .apc-category-count {
        font-size:11px; font-weight:600; color:var(--gr-2); background:var(--gr-6);
        padding:2px 9px; border-radius:100px;
      }
      .apc-select-all { padding:0 24px 12px; border-top:1px solid var(--gr-6); padding-top:12px; margin-top:-1px; }
      .apc-checkbox-label { display:flex; align-items:center; gap:8px; cursor:pointer; }
      .apc-checkbox-label input { width:15px; height:15px; accent-color:var(--cr); cursor:pointer; }

      /* Product rows — grid-aligned, generous spacing */
      .apc-rows { display:flex; flex-direction:column; }
      .apc-row {
        display:grid;
        grid-template-columns: 20px 56px 1fr 100px 110px auto;
        align-items:center; gap:20px;
        padding:22px 24px; border-top:1px solid var(--gr-6);
      }
      .apc-row-check { flex-shrink:0; }
      .apc-row-thumb.apc-row-thumb { width:56px; height:56px; }
      .apc-row-info { min-width:0; }
      .apc-row-name { font-size:14px; font-weight:600; margin-bottom:4px; }
      .apc-row-meta { display:flex; gap:10px; font-size:12px; color:var(--gr-2); }
      .apc-row-sku { color:var(--gr-3); }
      .apc-row-price { font-size:13px; font-weight:600; }
      .apc-row-stock { font-size:12px; color:var(--gr-2); }
      .apc-row-actions { display:flex; align-items:center; gap:18px; flex-shrink:0; }
      .apc-action-group { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding-right:18px; border-right:1px solid var(--gr-5); }
      .apc-action-group-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--gr-3); }
      .apc-action-group-row { display:flex; align-items:center; gap:14px; }
      .apc-row-menu { position:relative; }
      .apc-row-menu-btn { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gr-2); }
      .apc-row-menu-btn:hover { background:var(--gr-6); color:var(--bk); }
      .apc-row-menu-popover {
        position:absolute; top:calc(100% + 4px); right:0; z-index:20;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r-sm);
        box-shadow:var(--shadow-md); min-width:150px; overflow:hidden;
      }
      .apc-row-menu-item { display:block; width:100%; text-align:left; padding:9px 14px; font-size:13px; }
      .apc-row-menu-item:hover { background:var(--gr-6); }
      .apc-row-menu-danger { color:#dc2626; }
      .apc-row-menu-danger:hover { background:#fef2f2; }
      @media(max-width:900px){
        .apc-row{ grid-template-columns:20px 56px 1fr; }
        .apc-row-price, .apc-row-stock { grid-column:2 / 4; }
        .apc-row-actions{ grid-column:1 / -1; width:100%; justify-content:space-between; padding-top:12px; margin-top:8px; border-top:1px solid var(--gr-6); }
      }

      /* Customers page */
      .acu-list { display:flex; flex-direction:column; gap:12px; }
      .acu-card {
        display:grid;
        grid-template-columns: 48px 1.6fr 90px 130px 100px 100px 80px auto;
        align-items:center; gap:20px;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r);
        padding:20px 24px; transition:border-color .2s, box-shadow .2s;
      }
      .acu-card:hover { border-color:var(--gr-4); box-shadow:var(--shadow); }
      .acu-avatar {
        width:48px; height:48px; border-radius:50%; background:var(--bk); color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-size:14px; font-weight:700; letter-spacing:.02em; flex-shrink:0;
      }
      .acu-info { min-width:0; }
      .acu-name { font-size:14px; font-weight:600; margin-bottom:4px; }
      .acu-meta { display:flex; flex-direction:column; gap:2px; font-size:12px; color:var(--gr-2); }
      .acu-stat { display:flex; flex-direction:column; gap:4px; }
      .acu-stat-label { font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--gr-3); }
      .acu-stat-value { font-size:13px; font-weight:600; }
      .acu-stat-muted { font-weight:500; color:var(--gr-2); }
      .acu-status-pill { font-size:11px; font-weight:700; letter-spacing:.03em; padding:5px 12px; border-radius:100px; text-align:center; }
      @media(max-width:1100px){
        .acu-card { grid-template-columns:48px 1fr auto; row-gap:14px; }
        .acu-card > .acu-stat, .acu-card > .acu-status-pill { grid-column:span 1; }
      }

      /* Orders page */
      .aor-list { display:flex; flex-direction:column; gap:12px; }
      .aor-row {
        display:grid;
        grid-template-columns: 130px 1.4fr 90px 110px 90px 130px auto;
        align-items:center; gap:20px;
        background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r);
        padding:20px 24px; transition:border-color .2s, box-shadow .2s;
      }
      .aor-row:hover { border-color:var(--gr-4); box-shadow:var(--shadow); }
      .aor-cell { display:flex; flex-direction:column; gap:3px; min-width:0; }
      .aor-cell-center { align-items:center; text-align:center; }
      .aor-cell-actions { align-items:flex-end; }
      .aor-order-number { font-size:13px; font-weight:600; }
      .aor-customer-name { font-size:13px; font-weight:600; }
      .aor-amount { font-size:14px; font-weight:700; }
      .aor-pill { font-size:11px; font-weight:700; letter-spacing:.03em; text-transform:capitalize; padding:5px 12px; border-radius:100px; }
      .aor-status-select { font-size:11px; font-weight:600; text-transform:capitalize; padding:6px 10px; border-radius:100px; cursor:pointer; }
      @media(max-width:1000px){
        .aor-row { grid-template-columns:1fr 1fr; row-gap:14px; }
        .aor-cell-center { align-items:flex-start; text-align:left; }
        .aor-cell-actions { grid-column:1 / -1; align-items:flex-start; }
      }

      /* Modal */
      .admin-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:flex-start; justify-content:center; padding:40px 20px; overflow-y:auto; z-index:1000; }
      .admin-modal { background:var(--wh); border-radius:var(--r); max-width:520px; width:100%; max-height:calc(100vh - 80px); display:flex; flex-direction:column; }
      .admin-modal-wide { max-width:780px; }
      .admin-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); flex-shrink:0; }
      .admin-modal-close { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gr-2); }
      .admin-modal-close:hover { background:var(--gr-6); color:var(--bk); }
      .admin-modal-body { padding:24px; overflow-y:auto; }
      .admin-modal-actions { display:flex; justify-content:flex-end; gap:8px; padding:16px 24px; border-top:1px solid var(--gr-5); }

      /* Forms */
      .admin-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .admin-field { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:500; color:var(--gr-1); }
      .admin-field-wide { grid-column:1 / -1; }
      .admin-field input, .admin-field select, .admin-field textarea { font-size:13px; }
      .admin-form-error { color:#dc2626; font-size:12px; margin-top:12px; }
      .admin-variants-panel { margin-top:24px; padding-top:20px; border-top:1px solid var(--gr-5); }
      .admin-variants-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
      .admin-variant-row { display:flex; align-items:center; gap:12px; padding:8px 12px; background:var(--gr-6); border-radius:var(--r-sm); }
      .admin-variant-label { font-size:13px; flex:1; }
      .admin-variant-stock-input { width:70px; padding:6px 8px; font-size:13px; }
      .admin-variant-remove { width:24px; height:24px; border-radius:50%; color:var(--gr-2); font-size:16px; line-height:1; flex-shrink:0; }
      .admin-variant-remove:hover { background:#fef2f2; color:#dc2626; }
      .admin-variant-add-row { display:flex; gap:8px; align-items:center; }
      .admin-color-input { display:flex; gap:8px; align-items:center; }
      .admin-color-input input[type="color"] { width:36px; height:36px; padding:0; border:1px solid var(--gr-4); border-radius:var(--r-sm); cursor:pointer; flex-shrink:0; }
      .admin-color-input .input { flex:1; }
      @media(max-width:640px){ .admin-form-grid{grid-template-columns:1fr;} }

      /* Content Management */
      .acm-tabs { display:flex; gap:2px; margin-bottom:24px; border-bottom:1px solid var(--gr-5); }
      .acm-tab { padding:10px 18px; font-size:13px; font-weight:500; color:var(--gr-2); border-bottom:2px solid transparent; margin-bottom:-1px; }
      .acm-tab:hover { color:var(--bk); }
      .acm-tab-active { color:var(--bk); border-bottom-color:var(--cr); font-weight:600; }

      /* Modern CMS editor: section nav + fields/preview panel */
      .acm-sections { display:flex; flex-direction:column; gap:16px; }
      .acm-editor { display:grid; grid-template-columns:200px 1fr; gap:24px; align-items:start; }
      .acm-section-nav { display:flex; flex-direction:column; gap:2px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); padding:8px; position:sticky; top:0; }
      .acm-section-nav-item { text-align:left; padding:10px 14px; font-size:13px; font-weight:500; color:var(--gr-1); border-radius:var(--r-sm); transition:var(--trans); }
      .acm-section-nav-item:hover { background:var(--gr-6); }
      .acm-section-nav-active { background:var(--bk); color:#fff; font-weight:600; }
      .acm-section-nav-active:hover { background:var(--bk); }
      .acm-editor-panel { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); overflow:hidden; }
      .acm-editor-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); }
      .acm-section-body { display:grid; grid-template-columns:1.4fr 1fr; gap:24px; padding:24px; }
      .acm-fields { display:flex; flex-direction:column; gap:16px; }
      .acm-saved-flash { font-size:12px; font-weight:600; color:#16a34a; }
      @media(max-width:900px){ .acm-editor{ grid-template-columns:1fr; } .acm-section-nav{ flex-direction:row; overflow-x:auto; position:static; } .acm-section-body{ grid-template-columns:1fr; } }

      /* Live preview card */
      .acm-preview { background:var(--gr-6); border-radius:var(--r); padding:24px; align-self:start; position:sticky; top:0; }
      .acm-preview-eyebrow { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--gr-2); margin-bottom:14px; }
      .acm-preview-hero-title { font-size:22px; font-weight:700; letter-spacing:-.03em; margin-bottom:8px; }
      .acm-preview-hero-sub { font-size:13px; color:var(--gr-1); line-height:1.5; }
      .acm-preview-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--gr-2); margin-bottom:6px; }
      .acm-preview-divider { height:1px; background:var(--gr-5); margin:20px 0; }
      .acm-preview-dark { background:var(--bk); color:#fff; }
      .acm-footer-preview-text { font-size:13px; color:rgba(255,255,255,.55); line-height:1.6; max-width:220px; }
      .acm-footer-preview-copy { font-size:11px; color:rgba(255,255,255,.3); margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1); }
      .acm-preview-brand { background:var(--cr); color:#fff; text-align:center; }
      .acm-newsletter-preview-title { font-size:18px; font-weight:700; margin-bottom:8px; }
      .acm-newsletter-preview-body { font-size:12px; color:rgba(255,255,255,.75); line-height:1.5; margin-bottom:16px; }
      .acm-newsletter-preview-form { display:flex; gap:6px; }
      .acm-newsletter-preview-input { flex:1; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3); border-radius:var(--r-sm); font-size:11px; color:rgba(255,255,255,.6); padding:8px 10px; text-align:left; }

      /* Media library */
      .acm-media-folders { display:flex; gap:6px; flex-wrap:wrap; padding:16px 24px 0; }
      .acm-folder-tab { padding:6px 14px; font-size:12px; font-weight:500; border:1px solid var(--gr-4); border-radius:100px; color:var(--gr-1); transition:var(--trans); }
      .acm-folder-tab:hover { border-color:var(--bk); }
      .acm-folder-tab-active { background:var(--bk); color:#fff; border-color:var(--bk); }
      .acm-media-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:16px; padding:24px; }
      .acm-media-item { border:1px solid var(--gr-5); border-radius:var(--r-sm); overflow:hidden; background:var(--gr-6); }
      .acm-media-item img { width:100%; height:120px; object-fit:cover; display:block; }
      .acm-media-item-actions { display:flex; gap:6px; padding:8px; flex-wrap:wrap; }
      .acm-media-item-actions .btn { flex:1; padding:6px 8px; font-size:11px; min-width:60px; }
      .acm-replace-btn { cursor:pointer; text-align:center; }
      .acm-upload-preview { background:var(--gr-6); border-radius:var(--r); overflow:hidden; display:flex; align-items:center; justify-content:center; max-height:320px; }
      .acm-upload-preview img { width:100%; max-height:320px; object-fit:contain; display:block; }
    `}</style>
  );
}
