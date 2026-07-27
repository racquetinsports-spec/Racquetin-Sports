// ── Admin: Order Detail ───────────────────────────────────────────
// Redesigned again against a supplied mockup (used as design/layout
// reference, not copied pixel-for-pixel — see the two deliberate
// deviations noted below). Every shipment action function
// (handleCreate/handleSaveDetails/handleStatus/handleCancel/
// handleAddEvent/handleSwitchProvider) and the order-status dropdown
// are unchanged in behavior from the prior version — a previous pass
// briefly regressed the status dropdown to read-only and lint caught
// it before shipping; it's been deliberately double-checked present
// here again.
//
// Two intentional deviations from the mockup, both because the brief
// itself says to adapt this to the *existing* RacquetIn admin design
// language rather than import a new one:
//   1. Border radius stays on the site-wide var(--r) token (6px) —
//      the mockup's more rounded cards would be inconsistent with
//      every other admin page (Products, Categories, Customers) if
//      only this one page adopted a different radius.
//   2. "Order Timeline" below merges order + shipment milestones into
//      one lifecycle view (Order Placed → Payment Verified → Packed →
//      Shipped → Delivered), matching the mockup's image — but future
//      stages not yet reached are rendered muted/pending using your
//      REAL shipment_status, never a fabricated timestamp. A stage
//      only shows a real time once it has actually happened.
//
// Small additive exceptions (all read-only or narrowly scoped),
// carried over from the prior pass and unchanged here — see
// lib/api/orders.js and lib/api/customers.js for details: the
// order_items -> products join for brand/category, phone on the
// merged customer record, fetchCustomerOrderStats, and
// updateOrderNotes.
//
// Explicitly NOT built, per "do not change APIs / backend logic":
// "Resend Confirmation Email" (no backend capability exists to call)
// and a real PDF "Download" (uses the same print dialog as "Print
// Invoice" — browsers' own Save-as-PDF covers this without a new
// dependency).
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

// Icon paths (stroke-based, 24x24 viewBox) — kept as plain path data
// rather than a new icon library dependency, matching how icons are
// already done elsewhere in this admin (see CategoriesPage.jsx).
const ICONS = {
  bag:      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  check:    'M20 6 9 17l-5-5',
  package:  'M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3m18 0-9 5-9-5m18 0v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8',
  truck:    'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  x:        'M18 6 6 18M6 6l12 12',
  print:    'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  refresh:  'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.6 5.6L1 10m22 4-4.6 4.4A9 9 0 0 1 3.51 15',
};
function Icon({ d, size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

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

// Full order lifecycle, shown with real done/pending state — never a
// fabricated timestamp for a stage that hasn't actually happened yet.
const LIFECYCLE_STAGES = [
  { key: 'placed',   label: 'Order Placed',     icon: ICONS.bag },
  { key: 'verified', label: 'Payment Verified', icon: ICONS.check },
  { key: 'packed',   label: 'Packed',           icon: ICONS.package },
  { key: 'shipped',  label: 'Shipped',          icon: ICONS.truck },
  { key: 'delivered',label: 'Delivered',        icon: ICONS.home },
];
const SHIPMENT_STAGE_ORDER = ['pending', 'packed', 'shipped', 'in_transit', 'delivered'];

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);
  const [idCopied, setIdCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAllOrders({ limit: 200 }),
      fetchShipmentByOrderId(id),
    ]).then(([{ data }, { data: shipmentData }]) => {
      const found = data.find(o => o.id === id) || null;
      setOrder(found);
      setShipment(shipmentData);
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

  // Real payment_events, used only to find the actual verification
  // timestamp for the lifecycle view below — not displayed on its own.
  const paymentCapturedEvent = useMemo(() => {
    for (const p of order?.payments || []) {
      const ev = (p.payment_events || []).find(e => e.event_type === 'payment.captured');
      if (ev) return ev;
    }
    return null;
  }, [order]);

  const lifecycle = useMemo(() => {
    if (!order) return [];
    const shipmentStageIndex = shipment ? SHIPMENT_STAGE_ORDER.indexOf(shipment.shipment_status) : -1;
    const eventFor = type => (shipment?.shipment_events || []).find(e => e.event_type === type);
    return LIFECYCLE_STAGES.map((stage) => {
      if (stage.key === 'placed') return { ...stage, done: true, at: order.created_at };
      if (stage.key === 'verified') return { ...stage, done: !!(order.payment_verified || paymentCapturedEvent), at: paymentCapturedEvent?.received_at };
      // packed=1, shipped=2, delivered=4 in SHIPMENT_STAGE_ORDER
      const stageMap = { packed: 1, shipped: 2, delivered: 4 };
      const reached = shipmentStageIndex >= stageMap[stage.key];
      const ev = eventFor(stage.key) || eventFor(stage.key === 'shipped' ? 'in_transit' : stage.key);
      return { ...stage, done: reached, at: reached ? (ev?.occurred_at || null) : null };
    });
  }, [order, shipment, paymentCapturedEvent]);

  const latestPayment = useMemo(() => {
    if (!order?.payments?.length) return null;
    return [...order.payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }, [order]);

  const billingSameAsShipping = order && addressesEqual(order.billing_address, order.shipping_address);
  const customerName = order?.customers?.full_name || 'Guest';
  const customerEmail = order?.customers?.email || order?.shipping_address?.email || '';
  const customerPhone = order?.customers?.phone || order?.shipping_address?.phone || '';

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
      <div className="aod-print-hide">
        <Link to="/admin/orders" className="aod-back-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back to Orders
        </Link>
        <div className="aod-header-row">
          <div>
            <h1 className="admin-page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Order {order.order_number || order.id.slice(0, 8)}
              <button type="button" className="aod-icon-btn" title="Copy order ID" aria-label="Copy order ID" onClick={() => copyText(order.order_number || order.id, () => { setIdCopied(true); setTimeout(() => setIdCopied(false), 1400); })}>
                {idCopied ? <Icon d={ICONS.check} size={14} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
              </button>
            </h1>
            <p className="apc-subtitle">Placed on {formatDate(order.created_at)}</p>
          </div>
          <div className="aod-header-actions">
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon d={ICONS.print}/> Print Invoice</button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon d={ICONS.download}/> Download</button>
            <button className="btn btn-outline btn-sm" onClick={load}><Icon d={ICONS.refresh}/> Refresh</button>
          </div>
        </div>

        <div className="aod-badges">
          <StatusPill value={order.payment_status} colors={PAYMENT_STATUS_COLORS} />
          {order.payment_verified && <span className="aod-verified-badge"><Icon d={ICONS.check} size={11}/> Verified</span>}
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

      {/* ── Summary strip: one card, four columns ── */}
      <div className="admin-card aod-summary-strip aod-print-hide">
        <div className="aod-summary-col">
          <span className="admin-muted t-small">Total Amount</span>
          <div className="aod-summary-value">{formatPrice((order.total || 0) / 100)}</div>
        </div>
        <div className="aod-summary-col">
          <span className="admin-muted t-small">Items</span>
          <div className="aod-summary-value">{(order.order_items || []).reduce((n, i) => n + i.qty, 0)}</div>
        </div>
        <div className="aod-summary-col">
          <span className="admin-muted t-small">Payment Method</span>
          <div className="aod-summary-value" style={{ textTransform: 'capitalize' }}>{order.payment_method || latestPayment?.payment_method || '—'}</div>
        </div>
        <div className="aod-summary-col">
          <span className="admin-muted t-small">Fulfillment Status</span>
          <div style={{ marginTop: 4 }}><StatusPill value={order.status} colors={STATUS_COLORS} /></div>
        </div>
      </div>

      <div className="aod-grid">
        {/* ── Main column ── */}
        <div className="aod-main">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Purchased Products</h2></div>
            <div className="aod-products admin-card-body">
              {(order.order_items || []).map(i => (
                <div key={i.id} className="aod-product-row">
                  <div className="aod-product-img">
                    {i.image_url ? <img src={i.image_url} alt="" /> : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
                    )}
                  </div>
                  <div className="aod-product-info">
                    <div className="aod-product-name">{i.name}</div>
                    {(i.product?.brand || i.product?.category_slug) && (
                      <div className="admin-muted t-small">{[i.product?.brand, i.product?.category_slug].filter(Boolean).join(' · ')}</div>
                    )}
                    {i.variant && Object.keys(i.variant).length > 0 && (
                      <div className="admin-muted t-small">{Object.values(i.variant).filter(Boolean).join(' / ')}</div>
                    )}
                  </div>
                  <div className="aod-product-col"><span className="admin-muted t-small">Qty</span><div>{i.qty}</div></div>
                  {/* order_items.price is stored in plain rupees (it's a
                      direct snapshot of products.price, never converted) —
                      unlike order.total/subtotal/tax/shipping_cost below,
                      which genuinely ARE paise (converted once at the
                      Razorpay boundary in create-razorpay-order/index.ts).
                      Dividing this by 100 was a real bug: a ₹13,500 racket
                      displayed as ₹135. See that Edge Function's own
                      comment for why this asymmetry exists intentionally. */}
                  <div className="aod-product-col"><span className="admin-muted t-small">Unit Price</span><div>{formatPrice(i.price)}</div></div>
                  <div className="aod-product-col"><span className="admin-muted t-small">Subtotal</span><div style={{ fontWeight: 600 }}>{formatPrice(i.price * i.qty)}</div></div>
                  {i.product_id && (
                    <a className="btn btn-outline btn-sm aod-print-hide" href={`/product/${i.product_id}`} target="_blank" rel="noreferrer">Open in Store ↗</a>
                  )}
                </div>
              ))}
            </div>
            <div className="admin-order-totals">
              <div><span>Subtotal</span><span>{formatPrice((order.subtotal || 0) / 100)}</span></div>
              <div><span>Tax</span><span>{formatPrice((order.tax || 0) / 100)}</span></div>
              <div><span>Shipping</span><span>{formatPrice((order.shipping_cost || 0) / 100)}</span></div>
              <div><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>{order.discount > 0 ? `−${formatPrice(order.discount / 100)}` : '—'}</span></div>
              <div className="admin-order-total-final aod-grand-total"><span>Grand Total</span><span>{formatPrice((order.total || 0) / 100)}</span></div>
            </div>
          </div>

          <div className="aod-bottom-row">
            <div className="admin-card">
              <div className="admin-card-header"><h2 className="admin-card-title">Order Timeline</h2></div>
              <div className="aod-vtimeline admin-card-body">
                {lifecycle.map((stage, i) => (
                  <div key={stage.key} className={`aod-vt-item ${stage.done ? 'aod-vt-done' : 'aod-vt-pending'}`}>
                    <div className="aod-vt-icon"><Icon d={stage.icon} size={12}/></div>
                    {i < lifecycle.length - 1 && <div className="aod-vt-line" />}
                    <div className="aod-vt-body">
                      <div className="aod-vt-title">{stage.label}</div>
                      <div className="admin-muted t-small">{stage.at ? formatDate(stage.at) : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AdminShipmentPanel orderId={order.id} shipment={shipment} onChange={setShipment} />
          </div>

          <div className="admin-card aod-print-hide" style={{ marginTop: 24 }} id="aod-notes">
            <div className="admin-card-header"><h2 className="admin-card-title">Notes</h2></div>
            <div className="admin-card-body">
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
        </div>

        {/* ── Sidebar ── */}
        <div className="aod-side aod-print-hide">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Customer</h2></div>
            <div className="aod-customer-card admin-card-body">
              <div className="aod-avatar">{initials(customerName, customerEmail)}</div>
              <div className="aod-address-name">{customerName}</div>
              <div className="admin-muted t-small">{customerEmail}</div>
              {customerPhone && <div className="admin-muted t-small">{customerPhone}</div>}
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
            <div className="admin-card-body">
              <AddressBlock address={order.shipping_address} />
              {order.shipping_address && <div style={{ marginTop: 12, textAlign: 'right' }}><CopyBtn text={addressToText(order.shipping_address)} label="Copy Address" /></div>}
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Billing Address</h2></div>
            <div className="admin-card-body">
              {billingSameAsShipping ? (
                <p className="admin-muted t-small">Same as shipping address.</p>
              ) : (
                <AddressBlock address={order.billing_address} />
              )}
            </div>
          </div>

          {/* Payment Details and Price Breakdown kept as two separate
              cards per this brief's explicit "don't mix these together". */}
          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Payment Details</h2></div>
            <div className="admin-card-body">
              {latestPayment ? (
                <div className="aod-payment">
                  <div className="aod-payment-row"><span>Status</span><StatusPill value={latestPayment.status} colors={PAYMENT_STATUS_COLORS} /></div>
                  <div className="aod-payment-row"><span>Method</span><span style={{ textTransform: 'capitalize' }}>{latestPayment.payment_method || '—'}</span></div>
                  <div className="aod-payment-row"><span>Transaction ID</span><span className="admin-muted t-small">{latestPayment.provider_payment_id || '—'}</span></div>
                  <div className="aod-payment-row"><span>Verification</span><span>{latestPayment.signature_verified ? '✓ Verified' : 'Unverified'}</span></div>
                  <div className="aod-payment-row"><span>Payment Date</span><span>{latestPayment.captured_at ? formatDate(latestPayment.captured_at) : '—'}</span></div>
                </div>
              ) : (
                <p className="admin-muted t-small">No payment recorded yet.</p>
              )}
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Price Breakdown</h2></div>
            <div className="aod-payment admin-card-body">
              <div className="aod-payment-row"><span>Subtotal</span><span>{formatPrice((order.subtotal || 0) / 100)}</span></div>
              <div className="aod-payment-row"><span>Tax</span><span>{formatPrice((order.tax || 0) / 100)}</span></div>
              <div className="aod-payment-row"><span>Shipping</span><span>{formatPrice((order.shipping_cost || 0) / 100)}</span></div>
              <div className="aod-payment-row"><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>{order.discount > 0 ? `−${formatPrice(order.discount / 100)}` : '—'}</span></div>
              <div className="aod-payment-row" style={{ fontWeight: 700 }}><span>Total</span><span>{formatPrice((order.total || 0) / 100)}</span></div>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Quick Actions</h2></div>
            <div className="aod-actions-list admin-card-body">
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
        .aod-back-link { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--gr-2); margin-bottom:16px; transition:color .15s; }
        .aod-back-link:hover { color:var(--bk); }
        .aod-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .aod-header-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .aod-header-actions .btn { display:inline-flex; align-items:center; gap:6px; }

        .aod-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; color:var(--gr-2); transition:var(--trans); flex-shrink:0; }
        .aod-icon-btn:hover { background:var(--gr-6); color:var(--bk); }

        .aod-badges { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:14px; margin-bottom:20px; }
        .aod-verified-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:#10b981; background:rgba(16,185,129,.12); padding:3px 10px; border-radius:100px; }

        .aod-summary-strip { display:grid; grid-template-columns:repeat(4,1fr); padding:0; margin-bottom:24px; }
        .aod-summary-col { padding:20px 24px; border-right:1px solid var(--gr-5); }
        .aod-summary-col:last-child { border-right:none; }
        .aod-summary-value { font-size:20px; font-weight:700; letter-spacing:-.01em; margin-top:4px; }

        .aod-grid { display:grid; grid-template-columns:minmax(0, 2fr) minmax(320px, 0.9fr); gap:24px; align-items:start; }
        .aod-side { display:flex; flex-direction:column; }

        .aod-products { display:flex; flex-direction:column; }
        .aod-product-row { display:grid; grid-template-columns:72px 1fr auto auto auto auto; align-items:center; gap:16px; padding:16px 0; border-bottom:1px solid var(--gr-6); }
        .aod-product-row:last-child { border-bottom:none; }
        .aod-product-img { width:72px; height:72px; border-radius:var(--r-sm); background:var(--gr-6); overflow:hidden; display:flex; align-items:center; justify-content:center; color:var(--gr-3); flex-shrink:0; }
        .aod-product-img img { width:100%; height:100%; object-fit:cover; }
        .aod-product-info { min-width:0; display:flex; flex-direction:column; gap:2px; }
        .aod-product-name { font-size:14px; font-weight:600; }
        .aod-product-col { text-align:right; white-space:nowrap; }
        .aod-grand-total span:last-child { color:#10b981; }

        .aod-bottom-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:24px; align-items:start; }

        .aod-vtimeline { display:flex; flex-direction:column; }
        .aod-vt-item { display:flex; gap:14px; position:relative; padding-bottom:24px; }
        .aod-vt-item:last-child { padding-bottom:0; }
        .aod-vt-icon { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; z-index:1; background:var(--gr-5); color:var(--gr-3); }
        .aod-vt-done .aod-vt-icon { background:var(--bk); color:#fff; }
        .aod-vt-done:first-child .aod-vt-icon { background:var(--bk); }
        .aod-vt-line { position:absolute; left:13px; top:26px; bottom:0; width:1.5px; background:var(--gr-5); }
        .aod-vt-done .aod-vt-line { background:var(--gr-4); }
        .aod-vt-body { padding-top:3px; }
        .aod-vt-title { font-size:13.5px; font-weight:600; margin-top:2px; }
        .aod-vt-pending .aod-vt-title, .aod-vt-pending .admin-muted { color:var(--gr-3); }

        .aod-address { font-size:13px; line-height:1.7; color:var(--gr-1); }
        .aod-address-name { font-weight:600; color:var(--bk); margin-bottom:2px; }
        .aod-map-icon { color:var(--gr-2); transition:color .15s; }
        .aod-map-icon:hover { color:var(--cr); }

        .aod-copy-btn { font-size:11px; font-weight:500; color:var(--gr-2); border:1px solid var(--gr-4); border-radius:100px; padding:4px 10px; transition:var(--trans); }
        .aod-copy-btn:hover { border-color:var(--bk); color:var(--bk); }

        .aod-avatar { width:44px; height:44px; border-radius:50%; background:var(--bk); color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:600; flex-shrink:0; }
        .aod-customer-card { text-align:center; }
        .aod-customer-card .aod-avatar { margin:0 auto 10px; }
        .aod-metric-value { font-size:16px; font-weight:700; }
        .aod-customer-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid var(--gr-5); }
        .aod-quick-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:16px; }

        .aod-payment-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; font-size:13px; border-bottom:1px solid var(--gr-6); gap:12px; }
        .aod-payment-row:last-child { border-bottom:none; }
        .aod-payment-row > span:first-child { color:var(--gr-2); flex-shrink:0; }
        .aod-payment-row > span:last-child { text-align:right; word-break:break-word; }

        .aod-actions-list { display:flex; flex-direction:column; gap:8px; }
        .aod-actions-list .btn { width:100%; text-align:center; }

        @media(max-width:900px){
          .aod-grid { grid-template-columns:1fr; }
          .aod-bottom-row { grid-template-columns:1fr; }
          .aod-summary-strip { grid-template-columns:1fr 1fr; }
          .aod-summary-col:nth-child(2) { border-right:none; }
          .aod-summary-col:nth-child(n+3) { border-top:1px solid var(--gr-5); }
          .aod-product-row { grid-template-columns:56px 1fr; row-gap:6px; }
        }

        @media print {
          .aod-print-hide { display:none !important; }
          .admin-card { box-shadow:none !important; border:1px solid #ddd !important; break-inside:avoid; }
          .aod-grid, .aod-bottom-row { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}

const SHIPMENT_STATUS_COLORS = {
  pending: '#f59e0b', packed: '#3b82f6', shipped: '#8b5cf6',
  in_transit: '#0ea5e9', delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280',
};

function AdminShipmentPanel({ orderId, shipment, onChange }) {
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
      onChange(data);
      if (data) {
        setForm({
          courier_name: data.courier_name || '', tracking_number: data.tracking_number || '',
          tracking_url: data.tracking_url || '', estimated_delivery: data.estimated_delivery ? data.estimated_delivery.slice(0, 10) : '',
          label_url: data.label_url || '', notes: data.notes || '',
        });
      }
      setLoading(false);
    });
  }, [orderId, onChange]);

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

  if (loading) return <div className="admin-card aod-print-hide" style={{ padding: 24 }}><p className="admin-muted">Loading shipment…</p></div>;

  if (!shipment) {
    return (
      <div className="admin-card aod-print-hide" style={{ padding: 24, textAlign: 'center' }}>
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
    <div className="admin-card aod-print-hide">
      <div className="admin-card-body">
      <div className="admin-card-header" style={{ padding: 0, marginBottom: 18, border: 'none' }}>
        <h2 className="admin-card-title">Shipment</h2>
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

      <div className="aod-payment" style={{ marginBottom: 16 }}>
        <div className="aod-payment-row">
          <span>Status</span>
          <StatusPill value={shipment.shipment_status} colors={SHIPMENT_STATUS_COLORS} />
        </div>
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

      {(!shipment.tracking_number && (shipment.shipment_events || []).length === 0) && (
        <div className="aod-empty-inline">
          <Icon d={ICONS.truck} size={15}/> Not updated yet
        </div>
      )}

      <div className="aod-op-actions">
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('packed')} disabled={shipment.shipment_status === 'cancelled'}><Icon d={ICONS.package}/> Mark Packed</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('shipped')} disabled={shipment.shipment_status === 'cancelled'}><Icon d={ICONS.truck}/> Mark Shipped</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('in_transit')} disabled={shipment.shipment_status === 'cancelled'}><Icon d={ICONS.refresh}/> Mark In Transit</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleStatus('delivered')} disabled={shipment.shipment_status === 'cancelled'}><Icon d={ICONS.check}/> Mark Delivered</button>
        <button className="btn btn-outline btn-sm admin-btn-danger aod-cancel-btn" onClick={handleCancel} disabled={shipment.shipment_status === 'cancelled'}><Icon d={ICONS.x}/> Cancel Shipment</button>
      </div>

      <details className="aod-shipment-details">
        <summary>Edit shipment details & history</summary>
        <div className="admin-form-grid" style={{ marginTop: 16, marginBottom: 16 }}>
          <label className="admin-field"><span>Courier</span><input className="input" value={form.courier_name} onChange={e => setForm(f => ({ ...f, courier_name: e.target.value }))} /></label>
          <label className="admin-field"><span>Tracking Number</span><input className="input" value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} /></label>
          <label className="admin-field"><span>Tracking URL</span><input className="input" value={form.tracking_url} onChange={e => setForm(f => ({ ...f, tracking_url: e.target.value }))} /></label>
          <label className="admin-field"><span>Estimated Delivery</span><input className="input" type="date" value={form.estimated_delivery} onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} /></label>
          <label className="admin-field"><span>Label URL</span><input className="input" value={form.label_url} onChange={e => setForm(f => ({ ...f, label_url: e.target.value }))} /></label>
          <label className="admin-field admin-field-wide"><span>Shipment Notes</span><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleSaveDetails} disabled={saving} style={{ marginBottom: 20 }}>{saving ? 'Saving…' : 'Save Shipment Details'}</button>

        <h3 className="admin-card-title" style={{ fontSize: 13, marginBottom: 12 }}>History</h3>
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
      </details>
      </div>

      <style>{`
        .ash-timeline { display:flex; flex-direction:column; gap:14px; }
        .ash-timeline-item { display:flex; gap:12px; align-items:flex-start; }
        .ash-timeline-dot { width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; }
        .ash-timeline-desc { font-size:13px; font-weight:500; }
        .aod-op-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .aod-cancel-btn { grid-column:1 / -1; }
        .aod-op-actions .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; }
        .aod-empty-inline { display:flex; align-items:center; gap:8px; padding:12px 14px; background:var(--gr-6); border-radius:var(--r-sm); color:var(--gr-2); font-size:13px; margin-bottom:16px; }
        .aod-shipment-details summary { cursor:pointer; font-size:13px; font-weight:500; color:var(--gr-2); padding:12px 0; border-top:1px solid var(--gr-5); margin-top:16px; }
        .aod-shipment-details summary:hover { color:var(--bk); }
      `}</style>
    </div>
  );
}
