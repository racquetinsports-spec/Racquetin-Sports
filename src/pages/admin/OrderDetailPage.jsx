// ── Admin: Order Detail ───────────────────────────────────────────
// Extracted from the original AdminPages.jsx monolith — mechanical
// relocation only, no behavioral changes. Reuses the order-status
// vocabulary exported from OrdersPage.jsx rather than duplicating it.
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import { fetchAllOrders, updateOrderStatus } from '../../lib/api/orders';
import {
  fetchShipmentByOrderId, createShipment, updateShipment, markShipmentStatus, cancelShipment, logShipmentEvent, fetchDeliveryProviders,
} from '../../lib/api/shipments';
import { StatusPill } from './shared/AdminUI';
import { ORDER_STATUSES, STATUS_COLORS, PAYMENT_STATUS_COLORS } from './OrdersPage';

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
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('manual');
  // Surfaces two distinct things a provider call can produce beyond a
  // clean success: `providerWarning` — the shipment WAS created but
  // something non-fatal needs attention (e.g. Shiprocket order created
  // but courier auto-assignment failed); `actionError` — the call
  // failed outright (e.g. Shiprocket unreachable, bad secrets). Without
  // this, both used to fail silently — courierAssignError was returned
  // by the Edge Function but never read anywhere, and a thrown error
  // left the button stuck on "saving" forever with setSaving(false)
  // never reached.
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
          {/* Every order gets a 'manual' placeholder shipment automatically
              on fulfillment (see fulfillOrder.ts), so this is almost always
              how a real courier actually gets assigned in practice — not
              the "no shipment yet" empty state above, which in normal
              operation never actually occurs. Locked once the shipment has
              moved past 'pending' — switching couriers on something
              already handed off doesn't make sense and could leave two
              couriers both thinking they own it. */}
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
