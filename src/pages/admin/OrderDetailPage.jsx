// ── Admin: Order Detail ───────────────────────────────────────────
// Redesigned (Phase 2 of the admin UI pass) — presentation only for
// everything that already existed. Two small additive exceptions,
// both called out here and in lib/api/orders.js:
//   1. fetchAllOrders' select now also nests payment_events under
//      payments (real FK: payment_events.payment_id -> payments.id) —
//      this is what makes the Order Timeline below real data instead
//      of a fabricated one. Read-only, no behavior change.
//   2. updateOrderNotes is new — orders.notes already existed in the
//      schema with no UI anywhere to read or write it.
// Reuses the order-status vocabulary exported from OrdersPage.jsx
// rather than duplicating it.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import { fetchAllOrders, updateOrderStatus, updateOrderNotes } from '../../lib/api/orders';
import {
  fetchShipmentByOrderId, createShipment, updateShipment, markShipmentStatus, cancelShipment, logShipmentEvent, fetchDeliveryProviders,
} from '../../lib/api/shipments';
import { StatusPill } from './shared/AdminUI';
import { ORDER_STATUSES, STATUS_COLORS, PAYMENT_STATUS_COLORS } from './OrdersPage';

// Real payment_events.event_type values (see supabase/schema.sql) —
// unmapped types fall back to a generic label rather than being hidden,
// so nothing from the real data is ever silently dropped.
const EVENT_META = {
  'payment.captured':   { label: 'Payment captured',   color: '#10b981' },
  'payment.authorized': { label: 'Payment authorized', color: '#3b82f6' },
  'payment.failed':     { label: 'Payment failed',     color: '#ef4444' },
  'refund.processed':   { label: 'Refund processed',   color: '#f59e0b' },
};

function formatDate(d, opts) {
  return new Date(d).toLocaleString('en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function addressesEqual(a, b) {
  if (!a || !b) return false;
  const norm = x => JSON.stringify({ ...x, phone: undefined, email: undefined });
  return norm(a) === norm(b);
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

  useEffect(() => {
    setLoading(true);
    fetchAllOrders({ limit: 200 }).then(({ data }) => {
      const found = data.find(o => o.id === id) || null;
      setOrder(found);
      setNotes(found?.notes || '');
      setLoading(false);
    });
  }, [id]);

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

  // Real order timeline: one honest synthetic "Order placed" entry
  // (order.created_at is a real fact, not a guess) merged with actual
  // payment_events pulled through the payments join — never fabricated.
  const timeline = useMemo(() => {
    if (!order) return [];
    const events = [{ type: 'order.placed', label: 'Order placed', color: '#111', at: order.created_at }];
    (order.payments || []).forEach(p => {
      (p.payment_events || []).forEach(ev => {
        events.push({
          type: ev.event_type,
          label: EVENT_META[ev.event_type]?.label || ev.event_type,
          color: EVENT_META[ev.event_type]?.color || '#6b7280',
          at: ev.received_at,
        });
      });
    });
    return events.sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [order]);

  const latestPayment = useMemo(() => {
    if (!order?.payments?.length) return null;
    return [...order.payments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }, [order]);
  const earlierPayments = order?.payments?.length > 1 ? order.payments.filter(p => p.id !== latestPayment?.id) : [];

  const billingSameAsShipping = order && addressesEqual(order.billing_address, order.shipping_address);

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
      <div className="apc-header">
        <div>
          <h1 className="admin-page-title">Order {order.order_number || order.id.slice(0, 8)}</h1>
          <p className="apc-subtitle">Placed {formatDate(order.created_at)}</p>
        </div>
        <div className="apc-header-right">
          <Link to="/admin/orders" className="btn btn-outline btn-sm">Back to Orders</Link>
        </div>
      </div>

      {/* Order Summary */}
      <div className="admin-card aod-summary">
        <div className="aod-summary-chips">
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
        <div className="aod-summary-metrics">
          <div><span className="admin-muted t-small">Total</span><div className="aod-metric-value">{formatPrice((order.total || 0) / 100)}</div></div>
          <div><span className="admin-muted t-small">Items</span><div className="aod-metric-value">{(order.order_items || []).reduce((n, i) => n + i.qty, 0)}</div></div>
          <div><span className="admin-muted t-small">Payment Method</span><div className="aod-metric-value" style={{ textTransform: 'capitalize' }}>{order.payment_method || latestPayment?.payment_method || '—'}</div></div>
          <div><span className="admin-muted t-small">Customer</span><div className="aod-metric-value">{order.customers?.full_name || order.customers?.email || '—'}</div></div>
        </div>
      </div>

      <div className="aod-grid">
        {/* Main column */}
        <div className="aod-main">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Purchased Products</h2></div>
            <table className="admin-table">
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
              <tbody>
                {(order.order_items || []).map(i => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td className="admin-muted">{i.qty}</td>
                    <td>{formatPrice(i.price / 100)}</td>
                    <td>{formatPrice((i.price * i.qty) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-order-totals">
              <div><span>Subtotal</span><span>{formatPrice((order.subtotal || 0) / 100)}</span></div>
              {order.discount > 0 && <div><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>−{formatPrice(order.discount / 100)}</span></div>}
              <div><span>Tax</span><span>{formatPrice((order.tax || 0) / 100)}</span></div>
              <div><span>Shipping</span><span>{formatPrice((order.shipping_cost || 0) / 100)}</span></div>
              <div className="admin-order-total-final"><span>Total</span><span>{formatPrice((order.total || 0) / 100)}</span></div>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Order Timeline</h2></div>
            <div className="ash-timeline">
              {timeline.map((ev, i) => (
                <div key={i} className="ash-timeline-item">
                  <div className="ash-timeline-dot" style={{ background: ev.color }} />
                  <div>
                    <div className="ash-timeline-desc">{ev.label}</div>
                    <div className="admin-muted t-small">{formatDate(ev.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AdminShipmentPanel orderId={order.id} />

          <div className="admin-card" style={{ marginTop: 20 }}>
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

        {/* Sidebar */}
        <div className="aod-side">
          <div className="admin-card">
            <div className="admin-card-header"><h2 className="admin-card-title">Customer</h2></div>
            <div className="aod-address">
              <div className="aod-address-name">{order.customers?.full_name || 'Guest'}</div>
              <div className="admin-muted">{order.customers?.email || '—'}</div>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 20 }}>
            <div className="admin-card-header"><h2 className="admin-card-title">Shipping Address</h2></div>
            <AddressBlock address={order.shipping_address} />
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
                <div className="aod-payment-row"><span>Amount</span><span>{formatPrice((latestPayment.amount || 0) / 100)}</span></div>
                <div className="aod-payment-row"><span>Captured</span><span>{latestPayment.captured_at ? formatDate(latestPayment.captured_at) : '—'}</span></div>
                {latestPayment.provider_payment_id && <div className="aod-payment-row"><span>Payment ID</span><span className="admin-muted t-small">{latestPayment.provider_payment_id}</span></div>}
                {(latestPayment.status === 'refunded' || latestPayment.status === 'partially_refunded') && (
                  <div className="aod-payment-row"><span>Refunded</span><span>{formatPrice((latestPayment.refunded_amount || 0) / 100)}</span></div>
                )}
                {earlierPayments.length > 0 && (
                  <p className="admin-muted t-small" style={{ marginTop: 10 }}>+ {earlierPayments.length} earlier payment attempt{earlierPayments.length > 1 ? 's' : ''} on this order.</p>
                )}
              </div>
            ) : (
              <p className="admin-muted t-small">No payment recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .aod-summary { padding:20px 24px; margin-bottom:20px; }
        .aod-summary-chips { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
        .aod-verified-badge { font-size:11px; font-weight:600; color:#10b981; background:rgba(16,185,129,.12); padding:3px 10px; border-radius:100px; }
        .aod-summary-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; padding-top:16px; border-top:1px solid var(--gr-5); }
        .aod-metric-value { font-size:15px; font-weight:600; margin-top:2px; }

        .aod-grid { display:grid; grid-template-columns:1fr 340px; gap:20px; align-items:start; }
        .aod-side { display:flex; flex-direction:column; }

        .aod-address { font-size:13px; line-height:1.7; color:var(--gr-1); }
        .aod-address-name { font-weight:600; color:var(--bk); margin-bottom:2px; }

        .aod-payment-row { display:flex; align-items:center; justify-content:space-between; padding:7px 0; font-size:13px; border-bottom:1px solid var(--gr-6); }
        .aod-payment-row:last-child { border-bottom:none; }
        .aod-payment-row > span:first-child { color:var(--gr-2); }

        @media(max-width:900px){ .aod-grid { grid-template-columns:1fr; } .aod-summary-metrics { grid-template-columns:1fr 1fr; } }
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

  if (loading) return <div className="admin-card" style={{ marginTop: 20, padding: 24 }}><p className="admin-muted">Loading shipment…</p></div>;

  if (!shipment) {
    return (
      <div className="admin-card" style={{ marginTop: 20, padding: 24, textAlign: 'center' }}>
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
    <div className="admin-card" style={{ marginTop: 20, padding: 24 }}>
      <div className="admin-card-header" style={{ padding: 0, marginBottom: 18, border: 'none' }}>
        <h2 className="admin-card-title">Shipment</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <StatusPill value={shipment.shipment_status} colors={SHIPMENT_STATUS_COLORS} />
        </div>
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

      <h3 className="admin-card-title" style={{ fontSize: 14, marginBottom: 12 }}>Shipment Timeline</h3>
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
