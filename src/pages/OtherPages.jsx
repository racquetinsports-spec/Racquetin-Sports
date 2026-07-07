// ── All Pages ─────────────────────────────────────────────────────
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { useState, useEffect } from 'react';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';
import { initiatePayment, createRazorpayOrder, verifyRazorpayPayment } from '../lib/api/payments';
import { fetchOrders, fetchOrderById } from '../lib/api/orders';
import { fetchMyShipments } from '../lib/api/shipments';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchProducts, fetchProductsByIds } from '../lib/api/products';
import { normalizeProducts } from '../utils/normalizeProduct';
import { useSiteContent, pick } from '../hooks/useSiteContent';
import { fetchAllContent } from '../lib/api/content';
import { renderLegalMarkdown } from '../utils/renderLegalMarkdown';
import ProductCard from '../components/product/ProductCard';

// Mirrors supabase/functions/create-razorpay-order/index.ts — for display
// only. The server is the sole source of truth for the actual charge
// (it recomputes independently and ignores anything the client sends);
// this just lets the checkout page show a live, accurate-looking total
// as the customer picks a delivery method, instead of a placeholder.
// Keep these in sync with the Edge Function's constants by hand if either changes.
const CHECKOUT_TAX_RATE = parseFloat(import.meta.env.VITE_TAX_RATE || '0.18');
const CHECKOUT_FREE_SHIPPING_THRESHOLD = parseInt(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD || '500000', 10) / 100;
const CHECKOUT_STANDARD_SHIPPING = parseInt(import.meta.env.VITE_SHIPPING_COST || '8900', 10) / 100;
const CHECKOUT_EXPRESS_SHIPPING = 799;
const CHECKOUT_NEXT_DAY_SHIPPING = 1299;

function estimateCheckoutTotals(subtotal, delivery) {
  const shipping = delivery === 'exp' ? CHECKOUT_EXPRESS_SHIPPING
    : delivery === 'nxt' ? CHECKOUT_NEXT_DAY_SHIPPING
    : (subtotal >= CHECKOUT_FREE_SHIPPING_THRESHOLD ? 0 : CHECKOUT_STANDARD_SHIPPING);
  const tax = Math.round(subtotal * CHECKOUT_TAX_RATE);
  return { shipping, tax, total: subtotal + tax + shipping };
}

export function CartPage() {
  const { items, total, removeItem, updateQty } = useCart();
  return (
    <div className="container" style={{ padding: '40px 48px 80px' }}>
      <h1 className="t-h1" style={{ marginBottom: 32 }}>Your Cart</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gr-3)" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
          <p className="t-body">Your cart is empty.</p>
          <Link to="/rackets" className="btn btn-primary" style={{ marginTop: 24 }}>Shop Rackets</Link>
        </div>
      ) : (
        <div className="cart-page-layout">
          <div className="cart-page-items">
            {items.map(item => (
              <div key={item.id} className="cart-page-item">
                <div className="cart-page-img">
                    {item.product.images?.[0] && (
                      <img src={item.product.images[0]} alt={item.product.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:'8%' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    )}
                  </div>
                <div className="cart-page-info">
                  <div className="t-h4">{item.product.name}</div>
                  <div className="t-small">{item.product.series}</div>
                  {item.variant.color && <div className="t-small">Color: {item.variant.color}</div>}
                  {item.variant.grip && <div className="t-small">Grip: {item.variant.grip}</div>}
                  {item.variant.size && <div className="t-small">Size: {item.variant.size}</div>}
                  <div style={{ marginTop: 8 }}>
                    <div className="cart-qty">
                      <button onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="t-price">{formatPrice(item.product.price * item.qty)}</div>
                  <button className="t-small" style={{ color: 'var(--gr-2)', marginTop: 8 }} onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-page-summary">
            <h3 className="t-h4" style={{ marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-body">Subtotal</span><span className="t-price" style={{ fontSize: 16 }}>{formatPrice(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-body">Shipping</span><span className="t-small">Calculated at checkout</span>
            </div>
            <div className="divider" style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <span className="t-h4">Total</span><span className="t-price">{formatPrice(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Promo code" style={{ flex: 1 }} />
              <button className="btn btn-outline btn-sm">Apply</button>
            </div>
            <Link to="/checkout" className="btn btn-red btn-full btn-lg" style={{ marginTop: 16 }}>Checkout</Link>
          </div>
        </div>
      )}
      <style>{`
        .cart-page-layout{display:grid;grid-template-columns:1fr 340px;gap:40px;align-items:start;}
        .cart-page-item{display:flex;gap:20px;padding:20px 0;border-bottom:1px solid var(--gr-5);}
        .cart-page-img{width:88px;height:88px;background:#fff;border:1px solid var(--gr-5);border-radius:var(--r);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;}
        .cart-page-info{flex:1;}
        .cart-page-summary{background:var(--gr-6);padding:24px;border-radius:var(--r);position:sticky;top:80px;}
        .cart-qty{display:inline-flex;align-items:center;border:1.5px solid var(--gr-4);border-radius:var(--r-sm);overflow:hidden;}
        .cart-qty button{width:32px;height:32px;font-size:16px;}
        .cart-qty span{width:36px;text-align:center;font-size:13px;font-weight:600;border-left:1.5px solid var(--gr-4);border-right:1.5px solid var(--gr-4);height:32px;display:flex;align-items:center;justify-content:center;}
        @media(max-width:860px){.cart-page-layout{grid-template-columns:1fr;}}
      `}</style>
    </div>
  );
}

// ── Checkout Page ─────────────────────────────────────────────────
export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: user?.email || '', phone: '',
    address1: '', address2: '', city: '', postcode: '', country: 'India',
  });
  const [delivery, setDelivery] = useState('std');
  const checkoutEstimate = estimateCheckoutTotals(total, delivery);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [demoOrder, setDemoOrder] = useState(false); // only used when Supabase isn't configured at all

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const requiredFilled = form.firstName && form.email && form.phone && form.address1 && form.city && form.postcode;

  // Step 3 (of the 3-step flow) — the browser NEVER creates the order.
  // It hands Razorpay's response to the server, which recomputes the
  // signature itself and only then creates the order/payment/shipment.
  async function handlePaymentSuccess(response) {
    const { data, error: verifyError } = await verifyRazorpayPayment(response);
    if (verifyError) {
      // Payment may have succeeded on Razorpay's side but we couldn't
      // confirm it — never assume success. Cart stays intact so nothing
      // is lost, and the customer can retry or contact support with
      // their payment id.
      setError(`${verifyError.message} ${response?.razorpay_payment_id ? `(Payment ID: ${response.razorpay_payment_id})` : ''}`.trim());
      setSubmitting(false);
      return;
    }
    await clearCart(); // syncs local state — the server already cleared it server-side
    setSubmitting(false);
    navigate(`/order-confirmation/${data.order.id}`);
  }

  function handlePaymentFailure(err) {
    // "Keep cart intact, do not create an order, display retry payment" —
    // nothing is cleared or created here; the Complete Order button
    // below is the retry action, unchanged and still clickable.
    setError(err?.error?.description || 'Payment failed or was cancelled. Your cart has been kept — you can try again.');
    setSubmitting(false);
  }

  async function handleCompleteOrder() {
    setError('');
    if (!user) { navigate('/auth/login?redirect=checkout'); return; }
    if (!requiredFilled) { setError('Please fill in all required fields.'); return; }
    if (!isSupabaseConfigured()) {
      // No backend configured yet — nothing to persist to, keep the old demo behaviour.
      await clearCart();
      setDemoOrder(true);
      return;
    }
    if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
      setError('Payment isn\'t configured yet — please contact support to complete this order.');
      return;
    }

    setSubmitting(true);

    // Step 1 — server re-prices every item from the database (never
    // trusting this browser's numbers) and creates a real Razorpay order.
    const { data: rpOrder, error: createError } = await createRazorpayOrder({
      items: items.map(i => ({ productId: i.product.id, qty: i.qty, variant: i.variant })),
      shippingAddress: { ...form, delivery },
    });
    if (createError) { setError(createError.message || 'Could not start checkout.'); setSubmitting(false); return; }

    // Step 2 — open Razorpay Checkout using the server-issued order id
    // and server-computed amount, not anything computed in this component.
    await initiatePayment({
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      orderId: rpOrder.order_id,
      customerName: `${form.firstName} ${form.lastName}`.trim(),
      customerEmail: form.email,
      customerPhone: form.phone,
      description: `RacquetIn order — ${items.length} item${items.length !== 1 ? 's' : ''}`,
      onSuccess: handlePaymentSuccess,
      onFailure: handlePaymentFailure,
    });
  }

  if (demoOrder) {
    return (
      <div className="container" style={{ padding: '80px 48px', textAlign: 'center' }}>
        <h1 className="t-h1" style={{ marginBottom: 12 }}>Order placed</h1>
        <p className="t-body" style={{ marginBottom: 32 }}>
          This is a demo order — connect Supabase to process real, verified payments.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/rackets" className="btn btn-outline btn-lg">Continue Shopping</Link>
          <Link to="/account" className="btn btn-primary btn-lg">View Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 48px 80px' }}>
      <h1 className="t-h1" style={{ marginBottom: 40 }}>Checkout</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">Your cart is empty.</p>
          <Link to="/rackets" className="btn btn-primary" style={{ marginTop: 24 }}>Shop Rackets</Link>
        </div>
      ) : (
      <div className="checkout-layout">
        <div>
          {!user && (
            <div style={{ padding: '14px 16px', background: 'var(--gr-6)', borderRadius: 'var(--r)', marginBottom: 24 }}>
              <p className="t-small">
                <Link to="/auth/login?redirect=checkout" style={{ color: 'var(--cr)', fontWeight: 600 }}>Sign in</Link> to complete your order — your cart will carry over.
              </p>
            </div>
          )}
          <div className="checkout-section">
            <h3 className="t-h4" style={{ marginBottom: 20 }}>Contact Information</h3>
            <div className="checkout-grid-2">
              <input className="input" placeholder="First name" value={form.firstName} onChange={set('firstName')} />
              <input className="input" placeholder="Last name" value={form.lastName} onChange={set('lastName')} />
            </div>
            <input className="input" placeholder="Email address" style={{ marginTop: 12 }} value={form.email} onChange={set('email')} />
            <input className="input" placeholder="Phone number" style={{ marginTop: 12 }} value={form.phone} onChange={set('phone')} />
          </div>
          <div className="checkout-section">
            <h3 className="t-h4" style={{ marginBottom: 20 }}>Shipping Address</h3>
            <input className="input" placeholder="Address line 1" value={form.address1} onChange={set('address1')} />
            <input className="input" placeholder="Address line 2 (optional)" style={{ marginTop: 12 }} value={form.address2} onChange={set('address2')} />
            <div className="checkout-grid-2" style={{ marginTop: 12 }}>
              <input className="input" placeholder="City" value={form.city} onChange={set('city')} />
              <input className="input" placeholder="Postcode" value={form.postcode} onChange={set('postcode')} />
            </div>
            <select className="select" style={{ marginTop: 12, width: '100%' }} value={form.country} onChange={set('country')}>
              <option>India</option><option>United Kingdom</option><option>United States</option><option>Australia</option>
            </select>
          </div>
          <div className="checkout-section">
            <h3 className="t-h4" style={{ marginBottom: 20 }}>Delivery Method</h3>
            {[
              { id: 'std', label: 'Standard Delivery', sub: '3–5 business days', price: 'Free over ₹5,000' },
              { id: 'exp', label: 'Express Delivery', sub: '1–2 business days', price: '₹799' },
              { id: 'nxt', label: 'Next Day', sub: 'Order before 2pm', price: '₹1,299' },
            ].map(d => (
              <label key={d.id} className="delivery-option">
                <input type="radio" name="delivery" checked={delivery === d.id} onChange={() => setDelivery(d.id)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.label}</div>
                  <div className="t-small">{d.sub}</div>
                </div>
                <div className="t-small" style={{ marginLeft: 'auto' }}>{d.price}</div>
              </label>
            ))}
          </div>
          <div className="checkout-section">
            <h3 className="t-h4" style={{ marginBottom: 20 }}>Payment</h3>
            {isSupabaseConfigured() && import.meta.env.VITE_RAZORPAY_KEY_ID ? (
              <p className="t-small">Secure payment via Razorpay — you'll be prompted after clicking below.</p>
            ) : (
              <div style={{ padding: '20px', background: 'var(--gr-6)', borderRadius: 'var(--r)', textAlign: 'center' }}>
                <p className="t-small">Payment gateway not configured yet.</p>
                <p className="t-small" style={{ marginTop: 4 }}>
                  {isSupabaseConfigured() ? 'Order will be recorded as payment pending.' : 'This is a demo checkout.'}
                </p>
              </div>
            )}
            {error && <p className="t-small" style={{ color: 'var(--cr)', marginTop: 12 }}>{error}</p>}
            <button className="btn btn-red btn-full btn-lg" style={{ marginTop: 20 }} onClick={handleCompleteOrder} disabled={submitting}>
              {submitting ? 'Processing…' : !user ? 'Sign In to Checkout' : 'Complete Order'}
            </button>
          </div>
        </div>
        <div className="checkout-summary">
          <h3 className="t-h4" style={{ marginBottom: 20 }}>Order Summary</h3>
          {items.map(i => (
            <div key={i.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, background: '#fff', border: '1px solid var(--gr-5)', borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {i.product.images?.[0] && <img src={i.product.images[0]} alt={i.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8%' }} onError={e => { e.currentTarget.style.display = 'none'; }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.product.name}</div>
                <div className="t-small">Qty {i.qty}</div>
              </div>
              <div className="t-price" style={{ fontSize: 13 }}>{formatPrice(i.product.price * i.qty)}</div>
            </div>
          ))}
          <div className="divider" style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="t-body">Subtotal</span><span>{formatPrice(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="t-body">Shipping</span>
            <span>{checkoutEstimate.shipping === 0 ? 'Free' : formatPrice(checkoutEstimate.shipping)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="t-body">Tax</span><span>{formatPrice(checkoutEstimate.tax)}</span>
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="t-h4">Total</span><span className="t-price">{formatPrice(checkoutEstimate.total)}</span>
          </div>
          <p className="t-small" style={{ marginTop: 8, opacity: .7 }}>Final amount is confirmed by the payment provider before you're charged.</p>
        </div>
      </div>
      )}
      <style>{`
        .checkout-layout{display:grid;grid-template-columns:1fr 340px;gap:48px;align-items:start;}
        .checkout-section{margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid var(--gr-5);}
        .checkout-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .checkout-summary{background:var(--gr-6);padding:28px;border-radius:var(--r);position:sticky;top:80px;}
        .delivery-option{display:flex;align-items:center;gap:14px;padding:14px;border:1.5px solid var(--gr-4);border-radius:var(--r-sm);margin-bottom:8px;cursor:pointer;transition:var(--trans);}
        .delivery-option:hover{border-color:var(--bk);}
        @media(max-width:860px){.checkout-layout{grid-template-columns:1fr;}}
      `}</style>
    </div>
  );
}

// ── Order Confirmation Page ────────────────────────────────────────
// Reached only after verify-razorpay-payment has actually created the
// order — never shown speculatively, and there's no client-side path
// that fabricates one of these.
export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrderById(orderId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) setLoadError('Could not load your order.');
      else setOrder(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [orderId]);

  const deliveryEstimate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return <div className="container" style={{ padding: '80px 48px', textAlign: 'center' }}><p className="t-body">Loading your order…</p></div>;
  }
  if (loadError || !order) {
    return (
      <div className="container" style={{ padding: '80px 48px', textAlign: 'center' }}>
        <h1 className="t-h2" style={{ marginBottom: 12 }}>Order not found</h1>
        <p className="t-body" style={{ marginBottom: 24 }}>{loadError}</p>
        <Link to="/account" className="btn btn-primary">View Order History</Link>
      </div>
    );
  }

  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;

  return (
    <div className="container" style={{ padding: '64px 0 100px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div className="oc-check">✓</div>
        <h1 className="t-h1" style={{ marginTop: 20, marginBottom: 8 }}>Payment Successful</h1>
        <p className="t-body" style={{ marginBottom: 40 }}>Thank you — your order is confirmed.</p>

        <div className="oc-summary">
          <div className="oc-row"><span>Order Number</span><span className="oc-value">{order.order_number}</span></div>
          <div className="oc-row"><span>Amount Paid</span><span className="oc-value">{formatPrice((order.total || 0) / 100)}</span></div>
          <div className="oc-row"><span>Payment Method</span><span className="oc-value" style={{ textTransform: 'capitalize' }}>{order.payment_method || payment?.payment_method || '—'}</span></div>
          <div className="oc-row"><span>Estimated Delivery</span><span className="oc-value">{deliveryEstimate}</span></div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <Link to="/rackets" className="btn btn-outline btn-lg">Continue Shopping</Link>
          <Link to="/account" className="btn btn-primary btn-lg">Order History</Link>
        </div>
      </div>
      <style>{`
        .oc-check { width:64px; height:64px; margin:0 auto; border-radius:50%; background:#16a34a1a; color:#16a34a; font-size:30px; font-weight:700; display:flex; align-items:center; justify-content:center; }
        .oc-summary { background:var(--gr-6); border-radius:var(--r); padding:28px; text-align:left; }
        .oc-row { display:flex; justify-content:space-between; padding:10px 0; font-size:13px; color:var(--gr-1); border-bottom:1px solid var(--gr-5); }
        .oc-row:last-child { border-bottom:none; }
        .oc-value { font-weight:600; color:var(--bk); }
      `}</style>
    </div>
  );
}

// ── Wishlist Page ─────────────────────────────────────────────────
export function WishlistPage() {
  const { ids, loading: idsLoading } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (idsLoading) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchProductsByIds(ids)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setLoadError(error.message || 'Could not load your wishlist.'); setProducts([]); }
        else setProducts(normalizeProducts(data));
      })
      .catch(err => {
        if (!cancelled) { setLoadError(err.message || 'Could not load your wishlist.'); setProducts([]); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ids, idsLoading]);

  return (
    <div className="container" style={{ padding: '40px 48px 80px' }}>
      <h1 className="t-h1" style={{ marginBottom: 8 }}>Wishlist</h1>
      <p className="t-body" style={{ marginBottom: 40 }}>
        {loading ? 'Loading…' : `${products.length} saved item${products.length !== 1 ? 's' : ''}`}
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">Loading your wishlist…</p>
        </div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">{loadError}</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gr-3)" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
          <p className="t-body">Your wishlist is empty.</p>
          <Link to="/rackets" className="btn btn-primary" style={{ marginTop: 24 }}>Browse Products</Link>
        </div>
      ) : (
        <div className="grid-4">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ── Search Results ────────────────────────────────────────────────
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (q.length === 0) { setResults([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchProducts({ search: q, limit: 60 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setLoadError(error.message || 'Search failed.'); setResults([]); }
        else setResults(normalizeProducts(data));
      })
      .catch(err => {
        if (!cancelled) { setLoadError(err.message || 'Search failed.'); setResults([]); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className="container" style={{ padding: '40px 48px 80px' }}>
      <h1 className="t-h1" style={{ marginBottom: 8 }}>
        {q ? `Results for "${q}"` : 'Search'}
      </h1>
      <p className="t-body" style={{ marginBottom: 40 }}>
        {loading ? 'Searching…' : `${results.length} product${results.length !== 1 ? 's' : ''} found`}
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">Searching…</p>
        </div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">{loadError}</p>
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p className="t-body">No results found for "<strong>{q}</strong>"</p>
          <p className="t-small" style={{ marginTop: 8 }}>Try searching for: rackets, shoes, bags, shuttlecocks</p>
        </div>
      ) : (
        <div className="grid-4">
          {results.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}

/*
// ── Technology Page ───────────────────────────────────────────────
export function TechnologyPage() {
  const techs = [
    { name: 'AeroForge Frame', tagline: 'Aerodynamics, reimagined.', desc: 'Our triple-wall carbon fiber frame construction creates a unique aerodynamic cross-section that reduces drag by 23% compared to conventional round frames. The result is a faster swing arc and more explosive smash power.', stat: '−23%', statLabel: 'Drag Reduction' },
    { name: 'Power Core Shaft', tagline: 'Every watt, transferred.', desc: 'The Power Core Shaft uses variable-density graphite layup technology. The lower shaft stores energy during the backswing and releases it explosively at contact — delivering 94% mechanical energy transfer efficiency.', stat: '94%', statLabel: 'Energy Transfer' },
    { name: 'HexGrid String System', tagline: 'Precision, woven in.', desc: 'Our 22×23 HexGrid stringing pattern distributes tension evenly across the entire string bed, creating a uniform power zone that covers 98% of the face area. No more dead zones. Every shot counts.', stat: '98%', statLabel: 'Power Zone Coverage' },
    { name: 'ProGrip System', tagline: 'Control, by design.', desc: 'The ProGrip overgrip uses micro-channel polyurethane technology that wicks moisture away from the grip surface while maintaining tactile feedback. 94% vibration absorption at 500Hz impact frequency.', stat: '94%', statLabel: 'Vibration Absorption' },
  ];
  return (
    <div>
      <div style={{ background: 'var(--bk)', color: '#fff', padding: '80px 0 60px' }}>
        <div className="container">
          <div className="eyebrow" style={{ color: 'var(--cr)' }}>Innovation</div>
          <h1 className="t-h1" style={{ color: '#fff', maxWidth: 480 }}>Engineering Excellence</h1>
          <p className="t-body" style={{ color: 'rgba(255,255,255,.5)', marginTop: 16, maxWidth: 480 }}>
            Every RacquetIn product is built around four core technologies. Each one is engineered to give you a measurable competitive advantage.
          </p>
        </div>
      </div>
      {techs.map((t, i) => (
        <div key={t.name} className="container" style={{ padding: '72px 48px', borderBottom: '1px solid var(--gr-5)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
          <div style={{ direction: 'ltr' }}>
            <div className="eyebrow">{t.tagline}</div>
            <h2 className="t-h2" style={{ marginBottom: 16 }}>{t.name}</h2>
            <p className="t-body" style={{ marginBottom: 28 }}>{t.desc}</p>
            <div style={{ display: 'inline-block', padding: '20px 28px', background: 'var(--gr-6)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-.04em', color: 'var(--cr)' }}>{t.stat}</div>
              <div className="t-label" style={{ color: 'var(--gr-2)', marginTop: 4 }}>{t.statLabel}</div>
            </div>
          </div>
          <div style={{ direction: 'ltr', aspect: '1', background: 'var(--gr-6)', borderRadius: 'var(--r)', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40, color: 'var(--gr-3)' }}>{String(i+1).padStart(2,'0')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

*/

// ── About Page ────────────────────────────────────────────────────
export function AboutPage() {
  const { content } = useSiteContent();
  const mission = pick(content['about.mission'], 'To close the gap between what premium badminton equipment is capable of and what most brands choose to offer.');
  const vision = pick(content['about.vision'], 'A world where every serious player has access to equipment engineered to professional standards.');
  const story = pick(content['about.story'], 'RacquetIn was founded by players who were tired of choosing between price and performance.');

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'var(--bk)', color: '#fff', padding: '96px 0 80px' }}>
        <div className="container">
          <div className="eyebrow" style={{ color: 'var(--cr)' }}>About RacquetIn</div>
          <h1 className="t-h1" style={{ color: '#fff', maxWidth: 600, marginTop: 12 }}>
            Precision equipment for players<br />who care about the details.
          </h1>
        </div>
      </div>

      {/* Mission / Vision / Story */}
      <div className="section" style={{ borderBottom: '1px solid var(--gr-5)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
            <div>
              <div className="eyebrow">Mission</div>
              <p className="t-body" style={{ marginTop: 12 }}>{mission}</p>
            </div>
            <div>
              <div className="eyebrow">Vision</div>
              <p className="t-body" style={{ marginTop: 12 }}>{vision}</p>
            </div>
            <div>
              <div className="eyebrow">Story</div>
              <p className="t-body" style={{ marginTop: 12 }}>{story}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand story — primary */}
      <div className="section" style={{ borderBottom: '1px solid var(--gr-5)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
            <div>
              <div className="eyebrow">Our Conviction</div>
              <h2 className="t-h2" style={{ marginTop: 12, marginBottom: 28 }}>
                The equipment most players settle for is rarely the equipment they deserve.
              </h2>
              <p className="t-body" style={{ marginBottom: 18 }}>
                RacquetIn was built on a direct observation: there is a significant gap between what premium badminton equipment is capable of and what most brands choose to offer. The materials exist. The engineering knowledge exists. What has been missing is the discipline to apply both, consistently, across an entire product range.
              </p>
              <p className="t-body" style={{ marginBottom: 18 }}>
                We set out to close that gap. Not with marketing language or inflated specifications — with considered decisions made at every stage of product development, from material selection to the way a grip sits in the hand.
              </p>
              <p className="t-body">
                Every product in the RacquetIn range has been chosen and specified with the same question in mind: does this give a serious player a genuine advantage? If the answer is not clearly yes, it does not make it into the range.
              </p>
            </div>
            <div>
              <div style={{ background: 'var(--gr-6)', borderRadius: 'var(--r)', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo-r-monogram.png" alt="RacquetIn" style={{ width: 80, height: 80, objectFit: 'contain', display: 'block', opacity: .25 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand principles */}
      <div className="section" style={{ background: 'var(--gr-6)', borderBottom: '1px solid var(--gr-5)' }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 48 }}>What guides us</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
            {[
              {
                n: '01',
                title: 'Detail over defaults.',
                body: 'Frame geometry, string tension range, grip texture — these are not defaults. They are decisions. We make them deliberately and hold them to a standard that most equipment categories do not bother with.',
              },
              {
                n: '02',
                title: 'Performance benchmarks, not price points.',
                body: 'We work with material suppliers used in professional sport and test against performance standards rather than production cost targets. The result is equipment that performs to a different level.',
              },
              {
                n: '03',
                title: 'Presented with discipline.',
                body: 'We apply the same rigour to how we present our products as we do to how they perform. Clean design and honest information are not aesthetic choices — they are part of the product.',
              },
            ].map(p => (
              <div key={p.n}>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--cr)', letterSpacing: '.18em', marginBottom: 16 }}>{p.n}</div>
                <h3 className="t-h4" style={{ marginBottom: 12 }}>{p.title}</h3>
                <p className="t-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand story — closing */}
      <div className="section">
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}>The game</div>
          <h2 className="t-h2" style={{ marginTop: 12, marginBottom: 28 }}>
            Badminton is a precise game.
          </h2>
          <p className="t-body" style={{ maxWidth: 580, margin: '0 auto 18px', textAlign: 'center' }}>
            It demands fast decisions, consistent technique, and equipment that does not introduce variables you did not choose. A racket that is 3 grams heavier than it should be. A shuttle that drifts unpredictably. A shoe that does not grip when it needs to.
          </p>
          <p className="t-body" style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
            The equipment the game demands should be equally precise. RacquetIn exists to provide it.
          </p>
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--gr-5)' }}>
            {[['56', 'Products'], ['7', 'Categories'], ['2018', 'Established'], ['India', 'Headquarters']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, letterSpacing: '-.04em', color: 'var(--cr)' }}>{n}</div>
                <div className="t-small" style={{ marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact / company info placeholders */}
      <div style={{ background: 'var(--bk)', padding: '56px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
            {[
              { heading: 'Contact', lines: ['Email — pending', 'Phone — pending'] },
              { heading: 'Address', lines: ['Company address — pending'] },
              { heading: 'Follow', lines: ['Instagram — pending'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 16 }}>{col.heading}</div>
                {col.lines.map(l => (
                  <div key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', fontStyle: 'italic', marginBottom: 6 }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Legal Pages (Privacy Policy, Terms & Conditions) ───────────────
// Content is stored in Supabase (site_content, keys 'legal.privacy_policy'
// / 'legal.terms_conditions') and edited from the admin Content Management
// page — nothing here is hardcoded page copy, so it can be updated without
// a redeploy. If the key isn't set yet, this shows a graceful fallback
// instead of an empty or broken page.
function LegalPageLayout({ title, metaDescription, contentKey }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${title} — RacquetIn`;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) { tag = document.createElement('meta'); tag.name = 'description'; document.head.appendChild(tag); }
    const previousDescription = tag.getAttribute('content');
    tag.setAttribute('content', metaDescription);
    return () => { if (previousDescription) tag.setAttribute('content', previousDescription); };
  }, [title, metaDescription]);

  useEffect(() => {
    let cancelled = false;
    fetchAllContent().then(({ data }) => {
      if (!cancelled) { setContent(data?.[contentKey] || ''); setLoading(false); }
    }).catch(() => { if (!cancelled) { setContent(''); setLoading(false); } });
    return () => { cancelled = true; };
  }, [contentKey]);

  return (
    <div className="container-sm" style={{ padding: '64px 0 100px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 className="t-h1" style={{ marginBottom: 40 }}>{title}</h1>

        {loading ? (
          <p className="t-body admin-muted">Loading…</p>
        ) : content ? (
          <div className="legal-content">{renderLegalMarkdown(content)}</div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p className="t-body">This page hasn't been published yet. Please check back soon.</p>
          </div>
        )}
      </div>
      <style>{`
        .legal-content { font-size: 15px; line-height: 1.75; color: var(--gr-1); }
        .legal-h1 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; color: var(--bk); margin: 40px 0 16px; }
        .legal-h1:first-child { margin-top: 0; }
        .legal-h2 { font-size: 19px; font-weight: 700; letter-spacing: -.01em; color: var(--bk); margin: 32px 0 12px; }
        .legal-h3 { font-size: 15px; font-weight: 700; color: var(--bk); margin: 24px 0 8px; }
        .legal-p { margin-bottom: 16px; }
        .legal-ul { margin: 0 0 16px; padding-left: 22px; }
        .legal-ul li { margin-bottom: 8px; }
        .legal-hr { border: none; border-top: 1px solid var(--gr-5); margin: 32px 0; }
        .legal-content a { color: var(--cr); }
        @media(max-width: 640px){ .legal-h1{font-size:22px;} .legal-h2{font-size:17px;} }
      `}</style>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      metaDescription="How RacquetIn collects, uses, and protects your personal data."
      contentKey="legal.privacy_policy"
    />
  );
}

export function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      metaDescription="The terms governing your use of the RacquetIn website and your purchases."
      contentKey="legal.terms_conditions"
    />
  );
}

// ── Account Page ──────────────────────────────────────────────────
export function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect');
  const [orders, setOrders] = useState(null);
  const [shipmentsByOrder, setShipmentsByOrder] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchOrders().then(({ data }) => {
      const list = data || [];
      setOrders(list);
      const ids = list.map(o => o.id);
      if (ids.length) {
        fetchMyShipments(ids).then(({ data: shipments }) => {
          const map = {};
          (shipments || []).forEach(s => { map[s.order_id] = s; });
          setShipmentsByOrder(map);
        });
      }
    });
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth/login${redirect ? `?redirect=${redirect}` : ''}`, { replace: true });
    }
  }, [authLoading, user, redirect, navigate]);

  if (authLoading || !user) {
    return <div className="container-sm" style={{ padding: '80px 48px', textAlign: 'center' }}><p className="t-body">Loading…</p></div>;
  }

  return (
    <div className="container-sm" style={{ padding: '60px 48px 80px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 className="t-h2">My Account</h1>
            <p className="t-body" style={{ marginTop: 4 }}>{user.email}</p>
          </div>
          <button className="btn btn-outline" onClick={() => signOut()}>Sign Out</button>
        </div>
        <h3 className="t-h4" style={{ marginBottom: 16 }}>Order History</h3>
        {orders === null ? (
          <p className="t-small">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div style={{ padding: 24, background: 'var(--gr-6)', borderRadius: 'var(--r)', textAlign: 'center' }}>
            <p className="t-body">No orders yet.</p>
            <Link to="/rackets" className="btn btn-primary" style={{ marginTop: 16 }}>Shop Rackets</Link>
          </div>
        ) : (
          <div>
            {orders.map(o => {
              const shipment = shipmentsByOrder[o.id];
              const isOpen = expanded === o.id;
              return (
                <div key={o.id} style={{ borderBottom: '1px solid var(--gr-5)' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer' }}
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Order #{o.order_number || o.id.slice(0, 8)}</div>
                      <div className="t-small">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.status}
                        {shipment && <span> · {shipment.shipment_status.replace('_', ' ')}</span>}
                      </div>
                    </div>
                    <div className="t-price" style={{ fontSize: 14 }}>{formatPrice((o.total || 0) / 100)}</div>
                  </div>

                  {isOpen && (
                    <div style={{ paddingBottom: 20 }}>
                      {!shipment ? (
                        <p className="t-small" style={{ color: 'var(--gr-2)' }}>Shipment details will appear here once your order is being prepared.</p>
                      ) : (
                        <div className="acc-shipment">
                          <div className="acc-shipment-row">
                            <span className="t-small">Status</span>
                            <span className="acc-shipment-status" style={{ textTransform: 'capitalize' }}>{shipment.shipment_status.replace('_', ' ')}</span>
                          </div>
                          {shipment.courier_name && (
                            <div className="acc-shipment-row"><span className="t-small">Courier</span><span className="t-small">{shipment.courier_name}</span></div>
                          )}
                          {shipment.tracking_number && (
                            <div className="acc-shipment-row">
                              <span className="t-small">Tracking Number</span>
                              {shipment.tracking_url ? (
                                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="t-small" style={{ color: 'var(--cr)' }}>{shipment.tracking_number}</a>
                              ) : (
                                <span className="t-small">{shipment.tracking_number}</span>
                              )}
                            </div>
                          )}
                          {shipment.estimated_delivery && (
                            <div className="acc-shipment-row"><span className="t-small">Estimated Delivery</span><span className="t-small">{new Date(shipment.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                          )}

                          {(shipment.shipment_events || []).length > 0 && (
                            <div className="acc-timeline">
                              {shipment.shipment_events
                                .slice()
                                .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
                                .map(ev => (
                                  <div key={ev.id} className="acc-timeline-item">
                                    <div className="acc-timeline-dot" />
                                    <div>
                                      <div className="t-small" style={{ fontWeight: 500 }}>{ev.description}</div>
                                      <div className="t-small" style={{ color: 'var(--gr-2)' }}>{new Date(ev.occurred_at).toLocaleString('en-IN')}{ev.location ? ` · ${ev.location}` : ''}</div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .acc-shipment { background:var(--gr-6); border-radius:var(--r-sm); padding:16px; }
        .acc-shipment-row { display:flex; justify-content:space-between; padding:4px 0; }
        .acc-shipment-status { font-size:12px; font-weight:600; }
        .acc-timeline { margin-top:14px; padding-top:14px; border-top:1px solid var(--gr-5); display:flex; flex-direction:column; gap:12px; }
        .acc-timeline-item { display:flex; gap:10px; align-items:flex-start; }
        .acc-timeline-dot { width:6px; height:6px; border-radius:50%; background:var(--cr); margin-top:5px; flex-shrink:0; }
      `}</style>
    </div>
  );
}
