// ── Admin Dashboard ───────────────────────────────────────────────
// Protected: only accessible to users in the admin_users table.
// Routes: /admin, /admin/products, /admin/orders, /admin/customers,
//         /admin/coupons, /admin/settings, /admin/newsletter

import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchDashboardStats, fetchRecentOrders } from '../../lib/api/admin';
import { formatPrice } from '../../utils/format';
import { AdminPagesStyles } from './AdminPages';

// ── Guard: redirect non-admins ────────────────────────────────────
export function AdminGuard({ children }) {
  const { user, admin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    // Only redirect once auth is fully resolved AND there's genuinely no
    // user. An authenticated-but-not-admin user gets a 403 below instead
    // of being redirected — email is never checked, role comes only from
    // the admin_users row for this user's own UUID.
    if (!loading && !user) nav('/auth/login');
  }, [user, loading]);

  if (loading) return <div className="admin-loading">Verifying access...</div>;
  if (!user) return null; // redirect effect above is already navigating away
  if (!admin) return <AdminForbidden />;
  return children;
}

function AdminForbidden() {
  return (
    <div className="admin-loading" style={{ flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bk)' }}>403 — Access Denied</div>
      <div style={{ fontSize: 13, color: 'var(--gr-2)', textAlign: 'center', maxWidth: 320 }}>
        Your account is signed in but isn't registered as an admin. Contact a super admin if you believe this is a mistake.
      </div>
      <Link to="/" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Back to Store</Link>
    </div>
  );
}

// ── Admin Shell with sidebar ──────────────────────────────────────
const NAV = [
  { href: '/admin',            label: 'Dashboard',   icon: 'grid' },
  { href: '/admin/products',   label: 'Products',    icon: 'box' },
  { href: '/admin/categories', label: 'Categories',  icon: 'layers' },
  { href: '/admin/orders',     label: 'Orders',      icon: 'receipt' },
  { href: '/admin/customers',  label: 'Customers',   icon: 'users' },
  { href: '/admin/content',    label: 'Content',     icon: 'edit' },
  { href: '/admin/coupons',    label: 'Coupons',     icon: 'tag' },
  { href: '/admin/newsletter', label: 'Newsletter',  icon: 'mail' },
  { href: '/admin/settings',   label: 'Settings',    icon: 'settings' },
];

function AdminIcon({ name }) {
  const icons = {
    grid:     <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>,
    box:      <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    receipt:  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    tag:      <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    layers:   <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    edit:     <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></>,
    mail:     <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

export function AdminLayout() {
  const { pathname } = useLocation();
  return (
    <AdminGuard>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            <img src="/logo-r-monogram.png" alt="RacquetIn" className="admin-logo" />
            <span className="admin-badge">Admin</span>
          </div>
          <nav className="admin-nav">
            {NAV.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={`admin-nav-item ${pathname === item.href ? 'admin-nav-active' : ''}`}
              >
                <AdminIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <Link to="/" className="admin-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              View Store
            </Link>
          </div>
        </aside>
        <main className="admin-main">
          <Outlet />
          <AdminPagesStyles />
        </main>
      </div>
      <style>{`
        .admin-layout { display:flex; min-height:100vh; background:var(--gr-6); }
        .admin-loading { display:flex; align-items:center; justify-content:center; min-height:100vh; font-size:14px; color:var(--gr-2); }
        .admin-sidebar { width:220px; flex-shrink:0; background:var(--bk); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; }
        .admin-sidebar-brand { padding:24px 20px 16px; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(255,255,255,.08); }
        .admin-logo { width:28px; height:28px; object-fit:contain; filter:brightness(0) invert(1); }
        .admin-badge { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; background:var(--cr); color:#fff; padding:2px 6px; border-radius:2px; }
        .admin-nav { padding:12px 10px; flex:1; display:flex; flex-direction:column; gap:2px; }
        .admin-nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:var(--r-sm); font-size:13px; font-weight:500; color:rgba(255,255,255,.55); transition:all .15s; }
        .admin-nav-item:hover { background:rgba(255,255,255,.06); color:rgba(255,255,255,.9); }
        .admin-nav-active { background:rgba(255,255,255,.1) !important; color:#fff !important; }
        .admin-sidebar-footer { padding:12px 10px; border-top:1px solid rgba(255,255,255,.08); }
        .admin-main { flex:1; overflow-y:auto; }
      `}</style>
    </AdminGuard>
  );
}

// ── Dashboard Home ────────────────────────────────────────────────
export function AdminHome() {
  const [stats,  setStats]   = useState(null);
  const [orders, setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchRecentOrders(8)]).then(([s, o]) => {
      setStats(s);
      setOrders(o.data);
      setLoading(false);
    });
  }, []);

  const STATUS_COLORS = {
    pending:    '#f59e0b',
    processing: '#3b82f6',
    shipped:    '#8b5cf6',
    delivered:  '#10b981',
    cancelled:  '#ef4444',
    returned:   '#6b7280',
  };

  return (
    <div className="admin-page">
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="apc-subtitle">A quick look at how the store is performing.</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">Loading stats...</div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="admin-stats-grid">
            {[
              { label: 'Total Orders',   value: stats?.orders,    fmt: v => v.toLocaleString() },
              { label: 'Total Revenue',  value: stats?.revenue,   fmt: v => formatPrice(v / 100) },
              { label: 'Customers',      value: stats?.customers, fmt: v => v.toLocaleString() },
              { label: 'Low Stock Items', value: stats?.lowStock?.length, fmt: v => v, warn: v => v > 0 },
            ].map(s => (
              <div key={s.label} className={`admin-stat-card ${s.warn?.(s.value) ? 'admin-stat-warn' : ''}`}>
                <div className="admin-stat-value">{s.fmt(s.value ?? 0)}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Low stock alert */}
          {stats?.lowStock?.length > 0 && (
            <div className="admin-alert">
              <strong>Low stock:</strong>{' '}
              {stats.lowStock.map(p => `${p.name} (${p.stock} left)`).join(', ')}
            </div>
          )}

          {/* Recent orders */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Recent Orders</h2>
              <Link to="/admin/orders" className="btn btn-outline btn-sm">View All</Link>
            </div>
            <table className="admin-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`} className="admin-link">{o.order_number || o.id.slice(0,8)}</Link></td>
                    <td>{o.customers?.full_name || o.customers?.email || '—'}</td>
                    <td>{formatPrice((o.total || 0) / 100)}</td>
                    <td>
                      <span className="admin-status-pill" style={{ background: STATUS_COLORS[o.status] + '22', color: STATUS_COLORS[o.status] }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="admin-muted">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .admin-page { padding:32px; max-width:1200px; }
        .admin-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
        .admin-page-title { font-size:22px; font-weight:700; letter-spacing:-.02em; }
        .admin-page-loading { padding:48px; text-align:center; color:var(--gr-2); font-size:14px; }
        .admin-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .admin-stat-card { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); padding:20px 24px; }
        .admin-stat-warn { border-color:#fca5a5; background:#fff5f5; }
        .admin-stat-value { font-size:28px; font-weight:700; letter-spacing:-.04em; margin-bottom:4px; }
        .admin-stat-label { font-size:11px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--gr-2); }
        .admin-alert { padding:12px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:var(--r-sm); font-size:13px; margin-bottom:20px; }
        .admin-card { background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); margin-bottom:20px; }
        .admin-card-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); }
        .admin-card-title { font-size:15px; font-weight:600; letter-spacing:-.01em; }
        .admin-table { width:100%; border-collapse:collapse; font-size:13px; }
        .admin-table th { padding:10px 24px; text-align:left; font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--gr-2); border-bottom:1px solid var(--gr-5); }
        .admin-table td { padding:12px 24px; border-bottom:1px solid var(--gr-5); }
        .admin-table tr:last-child td { border-bottom:none; }
        .admin-link { color:var(--cr); font-weight:500; }
        .admin-muted { color:var(--gr-2); }
        .admin-status-pill { display:inline-block; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
        @media(max-width:900px){ .admin-stats-grid{grid-template-columns:1fr 1fr;} }
      `}</style>
    </div>
  );
}
