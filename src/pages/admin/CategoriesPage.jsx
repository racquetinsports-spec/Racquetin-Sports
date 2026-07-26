// ── Admin: Categories ─────────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes.
import { useState, useEffect, useCallback } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api/categories';
import { Toggle, Modal } from './shared/AdminUI';

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
