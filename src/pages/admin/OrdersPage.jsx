// ── Admin: Orders (list) ──────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes. ORDER_STATUSES/STATUS_COLORS/
// PAYMENT_STATUS_COLORS are exported here and re-imported by
// OrderDetailPage.jsx, which shares the same status vocabulary.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/format';
import { fetchAllOrders, updateOrderStatus } from '../../lib/api/orders';
import { StatusPill, Modal } from './shared/AdminUI';

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
export const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280',
};
export const PAYMENT_STATUS_COLORS = {
  pending: '#f59e0b', paid: '#10b981', failed: '#ef4444', refunded: '#6b7280',
};
const ORDER_SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'amount-desc', label: 'Amount: High to Low' },
  { value: 'amount-asc', label: 'Amount: Low to High' },
];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState(''); // '' | 'guest' | 'registered'
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
        o.customers?.email?.toLowerCase().includes(q) ||
        // customers is always null for a guest order — without this,
        // searching for a guest's own name/email found nothing at all.
        [o.shipping_address?.firstName, o.shipping_address?.lastName].filter(Boolean).join(' ').toLowerCase().includes(q) ||
        o.shipping_address?.email?.toLowerCase().includes(q)
      );
    }
    if (paymentFilter) list = list.filter(o => o.payment_status === paymentFilter);
    if (customerTypeFilter === 'guest') list = list.filter(o => !o.user_id);
    else if (customerTypeFilter === 'registered') list = list.filter(o => !!o.user_id);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'amount-desc': return b.total - a.total;
        case 'amount-asc': return a.total - b.total;
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [orders, search, paymentFilter, customerTypeFilter, sort]);

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
          <select className="select" value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)}>
            <option value="">All Customers</option>
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
          </select>
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            {ORDER_SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <h3>No orders found</h3>
          <p>Try a different status filter, or check back once new orders come in.</p>
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
                <div className="aor-customer-name">
                  {o.customers?.full_name || [o.shipping_address?.firstName, o.shipping_address?.lastName].filter(Boolean).join(' ') || '—'}
                  {!o.user_id && <span className="aor-guest-badge">Guest</span>}
                </div>
                <div className="admin-muted t-small">{o.customers?.email || o.shipping_address?.email || ''}</div>
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


