// ── Admin: Customers ──────────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes. View-only today (search,
// sort, view profile/order history) — no edit/disable capability,
// consistent with the rest of the current admin backend.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/format';
import { fetchAllCustomers } from '../../lib/api/customers';
import { Modal } from './shared/AdminUI';

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
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
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
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No customers found</h3>
          <p>Try a different search term, or check back once new customers sign up.</p>
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
