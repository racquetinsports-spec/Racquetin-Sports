// ── Admin: Order Detail ───────────────────────────────────────────
// Redesigned (deeper Phase 2 pass) — presentation only for everything
// that already existed; every shipment action function below
// (handleCreate/handleSaveDetails/handleStatus/handleCancel/
// handleAddEvent/handleSwitchProvider) is untouched from the prior
// version. Small additive exceptions, all read-only or narrowly
// scoped, called out here and in their respective lib/api files:
//   1. fetchAllOrders' select now also joins order_items -> products
//      for brand/category (read-only), and includes phone on the
//      merged customer record.
//   2. fetchCustomerOrderStats (customers.js) — a small aggregate
//      query, same pattern as fetchAllCustomers, for the sidebar
//      Customer card's Total Orders / Lifetime Spend.
//   3. CustomersPage.jsx now reads an optional ?q= URL param to
//      prefill its search box, so "View Customer" below is a real
//      working link rather than a dead one — no new route was added.
//
// Explicitly NOT built, per "do not change API calls / backend logic":
// "Resend Confirmation Email" has no backend capability to call yet
// (order confirmation emails only ever fire once, automatically, at
// fulfillment) — shown disabled with an explanation rather than wired
// to something that doesn't exist. "Download Invoice" uses the same
// browser print dialog as "Print Invoice" (every modern browser's
// print dialog offers Save as PDF) rather than adding a PDF-generation
// dependency for a UI-only pass.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import { fetchAllOrders, updateOrderStatus, updateOrderNotes } from '../../lib/api/orders';
import { fetchCustomerOrderStats } from '../../lib/api/customers';
import {
  fetchShipmentByOrderId, createShipment, updateShipment, markShipmentStatus, cancelShipment, logShipmentEvent, fetchDeliveryProviders,
} from '../../lib/api/shipments';
import { StatusPill } from './shared/AdminUI';
import { ORDER_STATUSES, STATUS_COLORS, PAYMENT_STATUS_COLORS } from './OrdersPage';

const EVENT_META = {
  'order.placed':       { label: 'Order Placed',       color: '#111827', icon: 'M12 4v16m8-8H4' },
  'payment.captured':   { label: 'Payment Verified',    color: '#10b981', icon: 'M20 6 9 17l-5-5' },
  'payment.authorized': { label: 'Payment Authorized',  color: '#3b82f6', icon: 'M20 6 9 17l-5-5' },
  'payment.failed':     { label: 'Payment Failed',      color: '#ef4444', icon: 'M18 6 6 18M6 6l12 12' },
  'refund.processed':   { label: 'Refund Processed',    color: '#f59e0b', icon: 'M3 12a9 9 0 1 0 9-9' },
};

function formatDate(d, opts) {
  return new Date(d).toLocaleString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
function addressesEqual(a, b) {
  if (!a || !b) return false;
  const norm = x => JSON.stringify({ ...x, phone: undefined, email: undefined });
  return norm(a) === norm(b);
}
function addressToText(a) {
  if (!a) return '';
  return [`${a.firstName || ''} ${a.lastName || ''}`.trim(), a.address1, a.address2, `${a.city || ''}${a.state ? ', ' + a.state : ''} ${a.postcode || ''}`.trim(), a.country].filter(Boolean).join(', ');
}
async function copyText(text, onDone) {
  try { await navigator.clipboard.writeText(text); onDone?.(); } catch { /* clipboard unavailable — silently no-op */ }
}

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="aod-copy-btn" onClick={() => copyText(text, () => { setCopied(true); setTimeout(() => setCopied(false), 1400); })}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function AddressBlock({ address }) {
  if (!address) return <p className="admin-muted t-small">Not provided.</p>;
  return (
    <div className="aod-address">
      <div className="aod-address-name">{address.firstName} {address.lastName}</div>
      <div>{address.address1}{address.address2 ? `, ${address.address2}` : ''}</div>
      <div>{address.city}{address.state ? `, ${address.state}` : ''} {address.postcode}</div>
      <div>{address.country}</div>
      {address.phone && <div className="admin-muted" style={{ marginTop: 6 }}>{address.phone}</div>}
      {address.email && <div className="admin-muted">{address.email}</div>}
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllOrders({ limit: 200 }).then(({ data }) => {
      const found = data.find(o => o.id === id) || null;
      setOrder(found);
      setNotes(found?.notes || '');
      setLoading(false);
      if (found?.user_id) fetchCustomerOrderStats(found.user_id).then(({ data: stats }) => setCustomerStats(stats));
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(status) {
    await updateOrderStatus(id, status);
    setOrder(o => ({ ...o, status }));
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    const { error } = await updateOrderNotes(id, notes);
    setNotesSaving(false);
    if (!error) { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 1600); }
  }

  const timeline = useMemo(() => {
    if (!order) return [];
    const events = [{ type: 'order.placed', at: order.created_at }];
    (order.payments || []).forEach(p => {
      (p.payment_events || []).forEach(ev => events.push({ type: ev.event_type, at: ev.received_at }));
    });
    return events
      .map(e => ({ ...e, ...(EVENT_META[e.type] || { label: e.type, color: '#6b7280', icon: 'M12 6v6l4 2' }) }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [order]);

  const latestPayment = useMemo(() => {
    if (!order?.payments?.length) return null;
    return [...order.payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }, [order]);
  const earlierPayments = order?.payments?.length > 1 ? order.payments.filter(p => p.id !== latestPayment?.id) : [];

  const billingSameAsShipping = order && addressesEqual(order.billing_address, order.shipping_address);
  const customerName = order?.customers?.full_name || 'Guest';
  const customerEmail = order?.customers?.email || order?.shipping_address?.email || '';

  if (loading) return (
    <div className="admin-page">
      <div className="aod-skel-header" />
      <div className="aod-grid">
        <div className="aod-main">{[0, 1].map(i => <div key={i} className="admin-card aod-skel-card" />)}</div>
        <div className="aod-side">{[0, 1, 2].map(i => <div key={i} className="admin-card aod-skel-card" style={{ height: 120 }} />)}</div>
      </div>
      <style>{`
        .aod-skel-header { height:52px; border-radius:var(--r); background:linear-gradient(90deg, var(--gr-6) 25%, var(--gr-5) 50%, var(--gr-6) 75%); background-size:200% 100%; animation:aod-shimmer 1.4s infinite; margin-bottom:20px; }
        .aod-skel-card { height:220px; background:linear-gradient(90deg, var(--gr-6) 25%, var(--gr-5) 50%, var(--gr-6) 75%); background-size:200% 100%; animation:aod-shimmer 1.4s infinite; margin-bottom:20px; }
        @keyframes aod-shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
      `}</style>
    </div>
  );

  if (!order) return (
    <div className="admin-page">
      <div className="admin-empty">
        <div className="admin-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <h3>Order not found</h3>
        <p>It may have been removed, or the link is out of date.</p>
        <button className="btn btn-primary btn-sm" onClick={() => nav('/admin/orders')}>Back to Orders</button>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      {/* ── Header ── */}
      <div className="apc-header aod-print-hide">
        <div>
          <h1 className="admin-page-title">Order {order.order_number || order.id.slice(0, 8)}</h1>
          <p className="apc-subtitle">Placed {formatDate(order.created_at)}</p>
          <div className="aod-badges">
            <StatusPill value={order.payment_status} colors={PAYMENT_STATUS_COLORS} />
            {order.payment_verified && <span className="aod-verified-badge">✓ Verified</span>}
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
        <div className="apc-header-right" style={{ position: 'relative' }}>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">Back to Orders</Link>
          <button className="btn btn-outline btn-sm" onClick={() => setMenuOpen(m => !m)} aria-haspopup="true" aria-expanded={menuOpen}>Actions ▾</button>
          {menuOpen && (
            <>
              <div className="aod-menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="aod-menu" role="menu">
                <button role="menuitem" onClick={() => { window.print(); setMenuOpen(false); }}>Print Invoice</button>
                <button role="menuitem" onClick={() => { window.print(); setMenuOpen(false); }}>Download Invoice (Save as PDF)</button>
                <button role="menuitem" onClick={() => { copyText(order.order_number || order.id); setMenuOpen(false); }}>Copy Order ID</button>
                <button role="menuitem" onClick={() => { load(); setMenuOpen(false); }}>Refresh</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="admin-stats-grid aod-stats aod-print-hide">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{formatPrice((order.total || 0) / 100)}</div>
          <div className="admin-stat-label">Total</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{(order.order_items || []).reduce((n, i) => n + i.qty, 0)}</div>
          <div className="admin-stat-label">Items</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ textTransform: 'capitalize' }}>{order.payment_method || latestPayment?.payment_method || '—'}</div>
          <div className="admin-stat-label">Payment Method</div>
        </div>
        <div className="admin-stat-card aod-stat-customer">
          <div className="aod-avatar aod-avatar-sm">{initials(customerName, customerEmail)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="aod-metric-value aod-truncate">{customerName}</div>
            <div className="admin-muted t-small aod-truncate">{customerEmail}</div>
          </div>
        </div>
      </div>

      <div className="aod-grid">
        {/* ── Main column ── */}
        <div className="aod-main">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Purchased Products</h2></div>
            <div className="aod-products">
              {(order.order_items || []).map(i => (
                <div key={i.id} className="aod-product-row">
                  <div className="aod-product-img">
                    {i.image_url ? <img src={i.image_url} alt="" /> : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
                    )}
                  </div>
                  <div className="aod-product-info">
                    <div className="aod-product-name">{i.name}</div>
                    <div className="admin-muted t-small">
                      {i.product?.brand && <span>{i.product.brand}</span>}
                      {i.product?.category_slug && <span style={{ textTransform: 'capitalize' }}>{i.product?.brand ? ' · ' : ''}{i.product.category_slug}</span>}
                      {i.variant && Object.keys(i.variant).length > 0 && (
                        <span>{(i.product?.brand || i.product?.category_slug) ? ' · ' : ''}{Object.values(i.variant).filter(Boolean).join(' / ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="aod-product-qty admin-muted t-small">Qty {i.qty}</div>
                  <div className="aod-product-price admin-muted t-small">{formatPrice(i.price / 100)}</div>
                  <div className="aod-product-subtotal">{formatPrice((i.price * i.qty) / 100)}</div>
                  {i.product_id && (
                    <a className="btn btn-outline btn-sm aod-print-hide" href={`/product/${i.product_id}`} target="_blank" rel="noreferrer">Open in Store</a>
                  )}
                </div>
              ))}
            </div>
            <div className="admin-order-totals">
              <div><span>Subtotal</span><span>{formatPrice((order.subtotal || 0) / 100)}</span></div>
              {order.discount > 0 && <div><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>−{formatPrice(order.discount / 100)}</span></div>}
              <div><span>Tax</span><span>{formatPrice((order.tax || 0) / 100)}</span></div>
              <div><span>Shipping</span><span>{formatPrice((order.shipping_cost || 0) / 100)}</span></div>
              <div className="admin-order-total-final"><span>Grand Total</span><span>{formatPrice((order.total || 0) / 100)}</span></div>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 24 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Order Timeline</h2></div>
            <div className="aod-vtimeline">
              {timeline.map((ev, i) => (
                <div key={i} className="aod-vt-item">
                  <div className="aod-vt-icon" style={{ background: ev.color }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={ev.icon}/></svg>
                  </div>
                  {i < timeline.length - 1 && <div className="aod-vt-line" />}
                  <div className="aod-vt-body">
                    <div className="aod-vt-title">{ev.label}</div>
                    <div className="admin-muted t-small">{formatDate(ev.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AdminShipmentPanel orderId={order.id} />

          <div className="admin-card aod-print-hide" style={{ marginTop: 24 }} id="aod-notes">
            <div className="admin-card-header"><h2 className="admin-card-title">Notes</h2></div>
            <textarea
              className="input"
              rows={4}
              placeholder="Internal notes about this order — not visible to the customer."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveNotes} disabled={notesSaving}>{notesSaving ? 'Saving…' : 'Save Notes'}</button>
              {notesSaved && <span className="acm-saved-flash">Saved ✓</span>}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="aod-side aod-print-hide">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Customer</h2></div>
            <div className="aod-customer-card">
              <div className="aod-avatar">{initials(customerName, customerEmail)}</div>
              <div className="aod-address-name">{customerName}</div>
              <div className="admin-muted t-small">{customerEmail}</div>
              {order.shipping_address?.phone && <div className="admin-muted t-small">{order.shipping_address.phone}</div>}
              <div className="aod-customer-stats">
                <div><div className="aod-metric-value">{customerStats?.count ?? '—'}</div><div className="admin-muted t-small">Total Orders</div></div>
                <div><div className="aod-metric-value">{customerStats ? formatPrice(customerStats.spend / 100) : '—'}</div><div className="admin-muted t-small">Lifetime Spend</div></div>
              </div>
              {order.customers?.created_at && <p className="admin-muted t-small" style={{ marginTop: 10 }}>Customer since {formatDate(order.customers.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
              <div className="aod-quick-row">
                {customerEmail && <a className="btn btn-outline btn-sm" href={`mailto:${customerEmail}`}>Email</a>}
                {customerEmail && <CopyBtn text={customerEmail} label="Copy Email" />}
                {customerEmail && <Link className="btn btn-outline btn-sm" to={`/admin/customers?q=${encodeURIComponent(customerEmail)}`}>View Customer</Link>}
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">Shipping Address</h2>
              {order.shipping_address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressToText(order.shipping_address))}`} target="_blank" rel="noreferrer" className="aod-map-icon" aria-label="View on map" title="View on map">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </a>
              )}
            </div>
            <AddressBlock address={order.shipping_address} />
            {order.shipping_address && <div style={{ marginTop: 10 }}><CopyBtn text={addressToText(order.shipping_address)} label="Copy Address" /></div>}
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Billing Address</h2></div>
            {billingSameAsShipping ? (
              <p className="admin-muted t-small">Same as shipping address.</p>
            ) : (
              <AddressBlock address={order.billing_address} />
            )}
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Payment</h2></div>
            {latestPayment ? (
              <div className="aod-payment">
                <div className="aod-payment-row"><span>Status</span><StatusPill value={latestPayment.status} colors={PAYMENT_STATUS_COLORS} /></div>
                <div className="aod-payment-row"><span>Method</span><span style={{ textTransform: 'capitalize' }}>{latestPayment.payment_method || '—'}</span></div>
                <div className="aod-payment-row"><span>Verification</span><span>{latestPayment.signature_verified ? '✓ Verified' : 'Unverified'}</span></div>
                <div className="aod-payment-row"><span>Transaction ID</span><span className="admin-muted t-small">{latestPayment.provider_payment_id || '—'}</span></div>
                <div className="aod-payment-row"><span>Payment Date</span><span>{latestPayment.captured_at ? formatDate(latestPayment.captured_at) : '—'}</span></div>
                <div className="aod-payment-row"><span>Amount</span><span>{formatPrice((latestPayment.amount || 0) / 100)}</span></div>
                <div className="aod-payment-row"><span>Tax</span><span>{formatPrice((order.tax || 0) / 100)}</span></div>
                <div className="aod-payment-row"><span>Shipping</span><span>{formatPrice((order.shipping_cost || 0) / 100)}</span></div>
                {order.coupon_code && <div className="aod-payment-row"><span>Coupon</span><span>{order.coupon_code}</span></div>}
                {(latestPayment.status === 'refunded' || latestPayment.status === 'partially_refunded') && (
                  <div className="aod-payment-row"><span>Refunded</span><span>{formatPrice((latestPayment.refunded_amount || 0) / 100)}</span></div>
                )}
                <div className="aod-payment-row" style={{ fontWeight: 700 }}><span>Grand Total</span><span>{formatPrice((order.total || 0) / 100)}</span></div>
                {earlierPayments.length > 0 && (
                  <p className="admin-muted t-small" style={{ marginTop: 10 }}>+ {earlierPayments.length} earlier payment attempt{earlierPayments.length > 1 ? 's' : ''} on this order.</p>
                )}
              </div>
            ) : (
              <p className="admin-muted t-small">No payment recorded yet.</p>
            )}
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Quick Actions</h2></div>
            <div className="aod-actions-list">
              {customerEmail && <Link className="btn btn-outline btn-sm" to={`/admin/customers?q=${encodeURIComponent(customerEmail)}`}>View Customer</Link>}
              <CopyBtn text={order.order_number || order.id} label="Copy Order ID" />
              <button className="btn btn-outline btn-sm" onClick={() => window.print()}>Print / Download Invoice</button>
              <button className="btn btn-outline btn-sm" disabled title="Not available yet — order confirmation emails only send automatically at checkout.">Resend Confirmation Email</button>
              <a className="btn btn-outline btn-sm" href="#aod-notes">Open Notes</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .aod-badges { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:10px; }
        .aod-verified-badge { font-size:11px; font-weight:600; color:#10b981; background:rgba(16,185,129,.12); padding:3px 10px; border-radius:100px; }

        .aod-menu-backdrop { position:fixed; inset:0; z-index:20; }
        .aod-menu { position:absolute; top:calc(100% + 6px); right:0; z-index:21; background:var(--wh); border:1px solid var(--gr-5); border-radius:var(--r); box-shadow:var(--shadow-md); min-width:220px; padding:6px; display:flex; flex-direction:column; }
        .aod-menu button { text-align:left; padding:9px 12px; font-size:13px; border-radius:var(--r-sm); transition:background .15s; }
        .aod-menu button:hover { background:var(--gr-6); }

        .aod-stats { grid-template-columns:repeat(4,1fr); margin-top:20px; margin-bottom:20px; }
        .aod-stat-customer { display:flex; align-items:center; gap:10px; }
        .aod-truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .aod-metric-value { font-size:15px; font-weight:600; }

        .aod-avatar { width:44px; height:44px; border-radius:50%; background:var(--bk); color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:600; flex-shrink:0; }
        .aod-avatar-sm { width:34px; height:34px; font-size:12px; }

        .aod-grid { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:start; }
        .aod-side { display:flex; flex-direction:column; }

        .aod-products { display:flex; flex-direction:column; }
        .aod-product-row { display:grid; grid-template-columns:48px 1fr auto auto auto auto; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--gr-6); }
        .aod-product-row:last-child { border-bottom:none; }
        .aod-product-img { width:48px; height:48px; border-radius:var(--r-sm); background:var(--gr-6); overflow:hidden; display:flex; align-items:center; justify-content:center; color:var(--gr-3); flex-shrink:0; }
        .aod-product-img img { width:100%; height:100%; object-fit:cover; }
        .aod-product-info { min-width:0; }
        .aod-product-name { font-size:13.5px; font-weight:600; }
        .aod-product-qty, .aod-product-price { white-space:nowrap; }
        .aod-product-subtotal { font-weight:600; font-size:13.5px; white-space:nowrap; }

        .aod-vtimeline { display:flex; flex-direction:column; }
        .aod-vt-item { display:flex; gap:14px; position:relative; padding-bottom:22px; }
        .aod-vt-item:last-child { padding-bottom:0; }
        .aod-vt-icon { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:1; }
        .aod-vt-line { position:absolute; left:13px; top:26px; bottom:0; width:1.5px; background:var(--gr-5); }
        .aod-vt-body { padding-top:3px; }
        .aod-vt-title { font-size:13.5px; font-weight:600; margin-top:2px; }

        .aod-address { font-size:13px; line-height:1.7; color:var(--gr-1); }
        .aod-address-name { font-weight:600; color:var(--bk); margin-bottom:2px; }
        .aod-map-icon { color:var(--gr-2); transition:color .15s; }
        .aod-map-icon:hover { color:var(--cr); }

        .aod-copy-btn { font-size:11px; font-weight:500; color:var(--gr-2); border:1px solid var(--gr-4); border-radius:100px; padding:4px 10px; transition:var(--trans); }
        .aod-copy-btn:hover { border-color:var(--bk); color:var(--bk); }

        .aod-customer-card { text-align:center; }
        .aod-customer-card .aod-avatar { margin:0 auto 10px; }
        .aod-customer-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid var(--gr-5); }
        .aod-quick-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:16px; }

        .aod-payment-row { display:flex; align-items:center; justify-content:space-between; padding:7px 0; font-size:13px; border-bottom:1px solid var(--gr-6); gap:12px; }
        .aod-payment-row:last-child { border-bottom:none; }
        .aod-payment-row > span:first-child { color:var(--gr-2); flex-shrink:0; }
        .aod-payment-row > span:last-child { text-align:right; word-break:break-word; }

        .aod-actions-list { display:flex; flex-direction:column; gap:8px; }
        .aod-actions-list .btn { width:100%; text-align:center; }

        @media(max-width:900px){
          .aod-grid { grid-template-columns:1fr; }
          .aod-stats { grid-template-columns:1fr 1fr; }
          .aod-product-row { grid-template-columns:40px 1fr; grid-template-areas:"img info" "img meta" "img actions"; row-gap:4px; }
        }

        @media print {
          .aod-print-hide { display:none !important; }
          .admin-card { box-shadow:none !important; border:1px solid #ddd !important; break-inside:avoid; }
          .aod-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
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
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('manual');
  const [providerWarning, setProviderWarning] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [trackingCopied, setTrackingCopied] = useState(false);

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
  useEffect(() => {
    fetchDeliveryProviders().then(({ data }) => {
      const active = (data || []).filter(p => p.is_active);
      setProviders(active);
      if (active.length) setSelectedProvider(active.find(p => p.slug === 'manual')?.slug || active[0].slug);
    });
  }, []);

  async function handleCreate() {
    setSaving(true);
    setProviderWarning(null);
    setActionError(null);
    try {
      const { warning, error } = await createShipment(orderId, { provider: selectedProvider });
      if (error) setActionError(error.message || 'Could not create shipment.');
      else if (warning) setProviderWarning(warning);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create shipment.');
    } finally {
      setSaving(false);
      load();
    }
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
    setActionError(null);
    const { error } = await cancelShipment(shipment.id);
    if (error) setActionError(error.message || 'Could not cancel shipment.');
    load();
  }

  async function handleAddEvent() {
    if (!eventForm.description.trim()) return;
    await logShipmentEvent(shipment.id, 'note', eventForm.description, eventForm.location || null);
    setEventForm({ description: '', location: '' });
    load();
  }

  async function handleSwitchProvider(newSlug) {
    if (newSlug === shipment.provider) return;
    setSaving(true);
    setProviderWarning(null);
    setActionError(null);
    try {
      const { warning, error } = await createShipment(orderId, { provider: newSlug });
      if (error) setActionError(error.message || 'Could not switch provider.');
      else if (warning) setProviderWarning(warning);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not switch provider.');
    } finally {
      setSaving(false);
      load();
    }
  }

  if (loading) return <div className="admin-card aod-print-hide" style={{ marginTop: 24, padding: 24 }}><p className="admin-muted">Loading shipment…</p></div>;

  if (!shipment) {
    return (
      <div className="admin-card aod-print-hide" style={{ marginTop: 24, padding: 24, textAlign: 'center' }}>
        <p className="admin-muted" style={{ marginBottom: 12 }}>No shipment created for this order yet.</p>
        {providers.length > 1 && (
          <select
            className="select"
            style={{ marginBottom: 12, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto' }}
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
          >
            {providers.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
        )}
        <div>
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : '+ Create Shipment'}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Shipment Timeline — read-only info display */}
      <div className="admin-card aod-print-hide" style={{ marginTop: 24, padding: 24 }}>
        <div className="admin-card-header" style={{ padding: 0, marginBottom: 18, border: 'none' }}>
          <h2 className="admin-card-title">Shipment Timeline</h2>
          <StatusPill value={shipment.shipment_status} colors={SHIPMENT_STATUS_COLORS} />
        </div>

        <div className="aod-payment" style={{ marginBottom: 18 }}>
          <div className="aod-payment-row"><span>Courier</span><span style={{ textTransform: 'capitalize' }}>{shipment.courier_name || '—'}</span></div>
          <div className="aod-payment-row">
            <span>Tracking Number</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {shipment.tracking_number || '—'}
              {shipment.tracking_number && (
                <button type="button" className="aod-copy-btn" onClick={() => copyText(shipment.tracking_number, () => { setTrackingCopied(true); setTimeout(() => setTrackingCopied(false), 1400); })}>
                  {trackingCopied ? 'Copied ✓' : 'Copy'}
                </button>
              )}
              {shipment.tracking_url && <a className="aod-copy-btn" href={shipment.tracking_url} target="_blank" rel="noreferrer">Track ↗</a>}
            </span>
          </div>
          <div className="aod-payment-row"><span>Estimated Delivery</span><span>{shipment.estimated_delivery ? formatDate(shipment.estimated_delivery, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
        </div>

        <h3 className="admin-card-title" style={{ fontSize: 13, marginBottom: 12 }}>History</h3>
        {(shipment.shipment_events || []).length === 0 ? (
          <div className="admin-empty" style={{ padding: '32px 20px' }}>
            <div className="admin-empty-icon" style={{ width: 40, height: 40 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <h3 style={{ fontSize: 14 }}>No tracking activity yet</h3>
            <p style={{ marginBottom: 0 }}>Updates will appear here once the shipment moves.</p>
          </div>
        ) : (
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
          </div>
        )}
      </div>

      {/* Shipment Management — operations panel */}
      <div className="admin-card aod-print-hide" style={{ marginTop: 24, padding: 24 }}>
        <div className="admin-card-header" style={{ padding: 0, marginBottom: 18, border: 'none' }}>
          <h2 className="admin-card-title">Shipment Management</h2>
          {shipment.shipment_status === 'pending' && providers.length > 1 ? (
            <select
              className="select"
              style={{ textTransform: 'capitalize', padding: '4px 8px', fontSize: 13 }}
              value={shipment.provider}
              onChange={e => handleSwitchProvider(e.target.value)}
              disabled={saving}
            >
              {providers.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          ) : (
            <span className="t-small admin-muted" style={{ textTransform: 'capitalize' }}>{shipment.provider}</span>
          )}
        </div>

        {providerWarning && (
          <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--r-sm)', marginBottom: 16, fontSize: 13, color: '#9A3412' }}>
            <strong>Shipment created, but:</strong> {providerWarning}
          </div>
        )}
        {actionError && (
          <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--r-sm)', marginBottom: 16, fontSize: 13, color: '#991B1B' }}>
            {actionError}
          </div>
        )}

        <div className="aod-op-actions">
          <button className="btn btn-outline btn-sm" onClick={() => handleStatus('packed')} disabled={shipment.shipment_status === 'cancelled'}>Mark Packed</button>
          <button className="btn btn-outline btn-sm" onClick={() => handleStatus('shipped')} disabled={shipment.shipment_status === 'cancelled'}>Mark Shipped</button>
          <button className="btn btn-outline btn-sm" onClick={() => handleStatus('in_transit')} disabled={shipment.shipment_status === 'cancelled'}>Mark In Transit</button>
          <button className="btn btn-outline btn-sm" onClick={() => handleStatus('delivered')} disabled={shipment.shipment_status === 'cancelled'}>Mark Delivered</button>
          <button className="btn btn-outline btn-sm admin-btn-danger" onClick={handleCancel} disabled={shipment.shipment_status === 'cancelled'}>Cancel Shipment</button>
        </div>

        <div className="admin-form-grid" style={{ marginTop: 20, marginBottom: 16 }}>
          <label className="admin-field"><span>Courier</span><input className="input" value={form.courier_name} onChange={e => setForm(f => ({ ...f, courier_name: e.target.value }))} /></label>
          <label className="admin-field"><span>Tracking Number</span><input className="input" value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} /></label>
          <label className="admin-field"><span>Tracking URL</span><input className="input" value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))} /></label>
          <label className="admin-field"><span>Estimated Delivery</span><input className="input" type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} /></label>
          <label className="admin-field"><span>Label URL</span><input className="input" value={form.label_url} onChange={e => setForm(f => ({ ...f, label_url: e.target.value }))} /></label>
          <label className="admin-field admin-field-wide"><span>Notes</span><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSaveDetails} disabled={saving} style={{ marginBottom: 20 }}>{saving ? 'Saving…' : 'Save Shipment Details'}</button>

        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Add a note (e.g. 'Left with security')" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} style={{ flex: 2 }} />
          <input className="input" placeholder="Location (optional)" value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} style={{ flex: 1 }} />
          <button className="btn btn-outline btn-sm" onClick={handleAddEvent}>Add</button>
        </div>
      </div>

      <style>{`
        .ash-timeline { display:flex; flex-direction:column; gap:14px; }
        .ash-timeline-item { display:flex; gap:12px; align-items:flex-start; }
        .ash-timeline-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .ash-timeline-desc { font-size:13px; font-weight:500; }
        .aod-op-actions { display:flex; gap:8px; flex-wrap:wrap; }
      `}</style>
    </>
  );
}
