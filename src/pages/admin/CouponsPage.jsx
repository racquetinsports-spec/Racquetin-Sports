// ── Admin: Coupons ─────────────────────────────────────────────────
// Phase 3 of the admin UI pass — a genuinely NEW page, not a redesign.
// The nav already had a "Coupons" link and the backend
// (fetchCoupons/createCoupon/updateCoupon in lib/api/admin.js) was
// already complete, but there was no route or page component behind
// it — clicking it 404'd. This wires the two together.
//
// Data-accuracy note: coupons.usage_count exists in the schema but is
// never actually incremented anywhere in the checkout/order flow (see
// fetchCouponRedemptions in lib/api/admin.js for the full explanation)
// — so this page computes real usage/discount-given stats from actual
// orders.coupon_code/discount instead of that column, which is
// accurate but permanently stuck. That underlying gap (usage limits
// not actually being enforced at checkout) is a real bug worth fixing
// separately — it's order/checkout logic, out of scope for this pass.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatPrice } from '../../utils/format';
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon, fetchCouponRedemptions } from '../../lib/api/admin';
import { Toggle, Modal, StatusPill } from './shared/AdminUI';

function emptyCouponForm() {
  return { code: '', type: 'percent', value: '', min_order_value: '', usage_limit: '', expires_at: '', is_active: true };
}

const STATUS_COLORS = { active: '#10b981', inactive: '#6b7280', expired: '#ef4444' };

function couponStatus(c) {
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 'expired';
  return c.is_active ? 'active' : 'inactive';
}

function formatDiscount(c) {
  return c.type === 'percent' ? `${c.value}%` : formatPrice((c.value || 0) / 100);
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [redemptions, setRedemptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCouponForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: couponData }, { data: redemptionData }] = await Promise.all([
      fetchCoupons(),
      fetchCouponRedemptions(),
    ]);
    setCoupons(couponData);
    setRedemptions(redemptionData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = coupons;
    if (statusFilter) list = list.filter(c => couponStatus(c) === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q));
    }
    return list;
  }, [coupons, statusFilter, search]);

  const stats = useMemo(() => {
    const active = coupons.filter(c => couponStatus(c) === 'active').length;
    const expired = coupons.filter(c => couponStatus(c) === 'expired').length;
    const totalDiscountGiven = Object.values(redemptions).reduce((sum, r) => sum + r.discountGiven, 0);
    const redeemedCount = coupons.filter(c => redemptions[c.code.toUpperCase()]?.count > 0).length;
    const redemptionRate = coupons.length ? Math.round((redeemedCount / coupons.length) * 100) : 0;
    return { active, expired, totalDiscountGiven, redemptionRate };
  }, [coupons, redemptions]);

  function openCreate() { setForm(emptyCouponForm()); setFormError(''); setEditing({}); }
  function openEdit(c) {
    setForm({
      code: c.code, type: c.type, value: c.value,
      min_order_value: c.min_order_value ? c.min_order_value / 100 : '',
      usage_limit: c.usage_limit ?? '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      is_active: c.is_active,
    });
    setFormError('');
    setEditing(c);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.value) { setFormError('Code and value are required.'); return; }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order_value: form.min_order_value ? Math.round(Number(form.min_order_value) * 100) : 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
    const { error } = editing.id ? await updateCoupon(editing.id, payload) : await createCoupon(payload);
    setSaving(false);
    if (error) { setFormError(error.message?.includes('duplicate') ? 'That code already exists.' : (error.message || 'Could not save coupon.')); return; }
    setEditing(null);
    load();
  }

  async function handleToggleActive(c, value) {
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: value } : x));
    await updateCoupon(c.id, { is_active: value });
  }

  async function handleDelete(c) {
    const usage = redemptions[c.code.toUpperCase()]?.count || 0;
    const confirmMsg = usage > 0
      ? `"${c.code}" has been used on ${usage} order${usage > 1 ? 's' : ''}. Deleting it won't affect those orders (the discount is already recorded on them), but the code itself will stop working. Delete anyway?`
      : `Delete coupon "${c.code}"?`;
    if (!window.confirm(confirmMsg)) return;
    const { error } = await deleteCoupon(c.id);
    if (error) { alert(error.message || 'Could not delete coupon.'); return; }
    load();
  }

  const hasFilters = search.trim() || statusFilter;

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Coupons</h1>
          <p className="apc-subtitle">Discount codes customers can apply at checkout.</p>
        </div>
        <div className="apc-header-right">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Coupon</button>
        </div>
      </div>

      {!loading && coupons.length > 0 && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.active}</div>
            <div className="admin-stat-label">Active Coupons</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.expired}</div>
            <div className="admin-stat-label">Expired Coupons</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{formatPrice(stats.totalDiscountGiven / 100)}</div>
            <div className="admin-stat-label">Total Discount Given</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.redemptionRate}%</div>
            <div className="admin-stat-label">Redemption Rate</div>
          </div>
        </div>
      )}

      {!loading && coupons.length > 0 && (
        <div className="acg-toolbar">
          <div className="acg-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search by code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="admin-card" style={{ padding: 24 }}><p className="admin-muted">Loading coupons…</p></div>
      ) : coupons.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <h3>No coupons yet</h3>
          <p>Create a discount code customers can apply at checkout.</p>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>Create your first coupon</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No coupons match your filters</h3>
          <p>Try a different search term or clear the status filter.</p>
          {hasFilters && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</button>}
        </div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr><th>Code</th><th>Discount</th><th>Type</th><th>Min Order</th><th>Usage</th><th>Expiry</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const status = couponStatus(c);
                const usage = redemptions[c.code.toUpperCase()]?.count || 0;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--fm)' }}>{c.code}</td>
                    <td>{formatDiscount(c)}</td>
                    <td style={{ textTransform: 'capitalize' }} className="admin-muted">{c.type}</td>
                    <td className="admin-muted">{c.min_order_value ? formatPrice(c.min_order_value / 100) : '—'}</td>
                    <td className="admin-muted">{usage}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                    <td className="admin-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'No expiry'}</td>
                    <td><StatusPill value={status} colors={STATUS_COLORS} /></td>
                    <td style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Toggle checked={c.is_active} onChange={v => handleToggleActive(c, v)} label="Active" />
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-outline btn-sm admin-btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Coupon' : 'New Coupon'} onClose={() => setEditing(null)}>
          <div className="admin-form-grid">
            <label className="admin-field"><span>Code *</span><input className="input" style={{ textTransform: 'uppercase' }} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SAVE10" /></label>
            <label className="admin-field">
              <span>Type</span>
              <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Value * {form.type === 'percent' ? '(%)' : '(₹)'}</span>
              <input className="input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percent' ? '10' : '500'} />
            </label>
            <label className="admin-field"><span>Minimum Order Value (₹)</span><input className="input" type="number" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))} placeholder="Optional" /></label>
            <label className="admin-field"><span>Usage Limit</span><input className="input" type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="Unlimited" /></label>
            <label className="admin-field"><span>Expiry Date</span><input className="input" type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></label>
            <div className="admin-field" style={{ display: 'flex', alignItems: 'center' }}>
              <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
            </div>
          </div>
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Coupon'}</button>
          </div>
        </Modal>
      )}

      <style>{`
        .acg-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .acg-search { display:flex; align-items:center; gap:8px; flex:1; min-width:200px; padding:8px 14px; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); color:var(--gr-2); }
        .acg-search input { border:none; outline:none; font-size:13px; width:100%; background:transparent; color:var(--bk); }
        .acg-search svg { flex-shrink:0; }
      `}</style>
    </div>
  );
}
