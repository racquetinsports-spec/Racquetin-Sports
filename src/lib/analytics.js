// ── Google Analytics 4 ───────────────────────────────────────────
// Single module every GA4 call in the app goes through — nothing
// outside this file should ever call window.gtag() directly. This is
// what makes it possible to reason about (and audit) exactly what
// data GA4 receives: read this file, and you've read everything that
// can possibly be sent.
//
// Measurement ID comes ONLY from import.meta.env.VITE_GA_MEASUREMENT_ID
// — never hardcoded here or anywhere else.
//
// PRIVACY — never pass these to any track*() call below:
//   customer name, email, phone, address, payment details,
//   Razorpay secrets/keys, Supabase secrets/keys, auth tokens.
// Every helper in this file only accepts the specific fields GA4's
// own recommended ecommerce schema calls for (item_id, item_name,
// item_brand, item_category, item_variant, price, quantity, discount,
// index, item_list_id, item_list_name — plus event-level fields like
// currency/value/tax/shipping/coupon/transaction_id/search_term).
//
// GRACEFUL FAILURE — every exported function is safe to call even if:
//   - VITE_GA_MEASUREMENT_ID is missing
//   - the gtag.js script is blocked (ad blocker, offline, etc.)
//   - init() was never called
// None of these can throw or log a console error from app code.

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const DEBUG = import.meta.env.VITE_GA_DEBUG === 'true';

// Only initialize when there's an ID AND we're either in a production
// build or debug mode is explicitly turned on — matches the
// requirement to stay silent in normal local development.
const SHOULD_INIT = !!MEASUREMENT_ID && (import.meta.env.PROD || DEBUG);

let initialized = false;
let lastTrackedPageKey = null; // pathname+search — guards against duplicate page_view

function debugLog(...args) {
  if (DEBUG) console.log('[GA4]', ...args);
}

// Safe wrapper — every call site in this file funnels through here so
// a blocked/missing gtag can never throw into app code.
function safeGtag(...args) {
  try {
    if (typeof window.gtag === 'function') window.gtag(...args);
  } catch (err) {
    debugLog('gtag call failed (ignored):', err);
  }
}

export function isAnalyticsEnabled() {
  return initialized;
}

// ── Init ─────────────────────────────────────────────────────────
// Call once, as early as possible (App.jsx does this on mount).
// Disables gtag.js's own automatic page_view (send_page_view: false)
// because in a client-side-routed SPA it would only ever fire once,
// for the very first URL — every route change afterwards needs its
// own explicit trackPageView() call, which this module handles.
export function initAnalytics() {
  if (initialized) return;
  if (!SHOULD_INIT) {
    debugLog(!MEASUREMENT_ID
      ? 'Skipped — VITE_GA_MEASUREMENT_ID not set.'
      : 'Skipped — not a production build and debug mode is off.');
    return;
  }

  try {
    if (!document.getElementById('ga4-gtag-src')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-src';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

    initialized = true;
    debugLog('Initialized with', MEASUREMENT_ID);
  } catch (err) {
    // A blocked script tag, a locked-down CSP, etc. — the site must
    // keep working either way.
    debugLog('Init failed (ignored):', err);
  }
}

// ── Generic event helper ────────────────────────────────────────
// Every track*() function below ultimately calls this. Exported too,
// for the rare one-off event that doesn't warrant its own named
// helper — but prefer adding a named helper for anything used more
// than once, so the event's shape is defined in exactly one place.
export function trackEvent(eventName, params = {}) {
  if (!initialized) return;
  debugLog(eventName, params);
  safeGtag('event', eventName, params);
}

// ── Page views ───────────────────────────────────────────────────
// path/search come from React Router's useLocation(); title is
// whatever document.title currently is (each page already sets its
// own via the site's existing title-setting effects).
export function trackPageView({ path, search = '', title }) {
  if (!initialized) return;
  const key = path + search;
  if (key === lastTrackedPageKey) return; // dedupe (StrictMode double-invoke, redundant effect runs)
  lastTrackedPageKey = key;

  trackEvent('page_view', {
    page_title: title ?? document.title,
    page_path: path + search,
    page_location: window.location.href,
  });
}

// ── Item object builder ─────────────────────────────────────────
// Builds a GA4 item object from a normalized product (see
// utils/normalizeProduct.js for the shape). `index` should be the
// item's position in whatever list it's being shown in — callers
// pass this straight from their own already-ordered .map((p, i) => …),
// which for rackets already reflects the Yonex → Li-Ning → Hundred
// brand priority (see utils/brandOrder.js) since that ordering is
// applied upstream, before the list ever reaches this function. This
// file does not re-sort anything — it only records the position it's
// given.
export function buildItem(product, { quantity, variant, discount, index, listId, listName } = {}) {
  if (!product) return null;
  const item = {
    item_id: product.id,
    item_name: product.name,
  };
  if (product.brand) item.item_brand = product.brand;
  if (product.category) item.item_category = product.category;
  if (variant) item.item_variant = variant;
  if (typeof product.price === 'number') item.price = product.price;
  if (typeof quantity === 'number') item.quantity = quantity;
  if (typeof discount === 'number') item.discount = discount;
  if (typeof index === 'number') item.index = index;
  if (listId) item.item_list_id = listId;
  if (listName) item.item_list_name = listName;
  return item;
}

// ── Ecommerce: browsing ─────────────────────────────────────────
export function trackViewItemList(products, { listId, listName } = {}) {
  const items = (products || []).map((p, i) => buildItem(p, { index: i, listId, listName })).filter(Boolean);
  if (!items.length) return;
  trackEvent('view_item_list', { item_list_id: listId, item_list_name: listName, items });
}

export function trackSelectItem(product, { index, listId, listName } = {}) {
  const item = buildItem(product, { index, listId, listName });
  if (!item) return;
  trackEvent('select_item', { item_list_id: listId, item_list_name: listName, items: [item] });
}

export function trackViewItem(product) {
  const item = buildItem(product);
  if (!item) return;
  trackEvent('view_item', {
    currency: 'INR',
    value: typeof product?.price === 'number' ? product.price : undefined,
    items: [item],
  });
}

// ── Ecommerce: cart ──────────────────────────────────────────────
export function trackAddToCart(product, { quantity = 1, variant } = {}) {
  const item = buildItem(product, { quantity, variant });
  if (!item) return;
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: typeof product?.price === 'number' ? product.price * quantity : undefined,
    items: [item],
  });
}

export function trackRemoveFromCart(product, { quantity = 1, variant } = {}) {
  const item = buildItem(product, { quantity, variant });
  if (!item) return;
  trackEvent('remove_from_cart', {
    currency: 'INR',
    value: typeof product?.price === 'number' ? product.price * quantity : undefined,
    items: [item],
  });
}

export function trackViewCart(cartItems) {
  const items = (cartItems || [])
    .map(i => buildItem(i.product, { quantity: i.qty }))
    .filter(Boolean);
  if (!items.length) return;
  const value = (cartItems || []).reduce((sum, i) => sum + (i.product?.price || 0) * i.qty, 0);
  trackEvent('view_cart', { currency: 'INR', value, items });
}

// ── Wishlist (add_to_wishlist is GA4-standard; remove_from_wishlist
// is a matching custom event — GA4 doesn't define a standard one) ──
export function trackAddToWishlist(product) {
  const item = buildItem(product);
  if (!item) return;
  trackEvent('add_to_wishlist', {
    currency: 'INR',
    value: typeof product?.price === 'number' ? product.price : undefined,
    items: [item],
  });
}

export function trackRemoveFromWishlist(product) {
  const item = buildItem(product);
  if (!item) return;
  trackEvent('remove_from_wishlist', {
    currency: 'INR',
    value: typeof product?.price === 'number' ? product.price : undefined,
    items: [item],
  });
}

// ── Ecommerce: checkout funnel ────────────────────────────────────
export function trackBeginCheckout(cartItems) {
  const items = (cartItems || [])
    .map(i => buildItem(i.product, { quantity: i.qty }))
    .filter(Boolean);
  if (!items.length) return;
  const value = (cartItems || []).reduce((sum, i) => sum + (i.product?.price || 0) * i.qty, 0);
  trackEvent('begin_checkout', { currency: 'INR', value, items });
}

// Fired when the shipping/delivery method is selected on the checkout
// page — GA4's recommended add_shipping_info shape.
export function trackAddShippingInfo(cartItems, { shippingTier } = {}) {
  const items = (cartItems || [])
    .map(i => buildItem(i.product, { quantity: i.qty }))
    .filter(Boolean);
  if (!items.length) return;
  const value = (cartItems || []).reduce((sum, i) => sum + (i.product?.price || 0) * i.qty, 0);
  trackEvent('add_shipping_info', {
    currency: 'INR',
    value,
    shipping_tier: shippingTier,
    items,
  });
}

// Fired when the customer reaches the payment step (i.e. they've
// submitted the order form and Razorpay Checkout is about to open —
// this app doesn't have visibility into which payment method they
// pick *inside* Razorpay's own modal, so this marks "reached payment",
// which is the closest equivalent available.
export function trackAddPaymentInfo(cartItems) {
  const items = (cartItems || [])
    .map(i => buildItem(i.product, { quantity: i.qty }))
    .filter(Boolean);
  if (!items.length) return;
  const value = (cartItems || []).reduce((sum, i) => sum + (i.product?.price || 0) * i.qty, 0);
  trackEvent('add_payment_info', { currency: 'INR', value, items });
}

// ── Purchase ─────────────────────────────────────────────────────
// Call this ONLY after the server has confirmed: payment verified,
// order created, inventory updated — i.e. only with real order data
// loaded from the database (see OrderConfirmationPage), never with
// anything computed client-side before that point.
//
// Deduplication: keyed on the order's own id in localStorage (not
// sessionStorage — an order confirmation URL is permanent and a
// customer may reasonably revisit it in a new tab or days later from
// a bookmark/email link, and it must still not double-count). Safe
// even if localStorage is unavailable (private browsing, storage
// disabled) — falls through to "not yet tracked" and, worst case,
// re-fires once more rather than silently breaking the page.
const PURCHASE_TRACKED_PREFIX = 'ga4_purchase_tracked_';

function isPurchaseAlreadyTracked(orderId) {
  try {
    return localStorage.getItem(PURCHASE_TRACKED_PREFIX + orderId) === '1';
  } catch {
    return false;
  }
}

function markPurchaseTracked(orderId) {
  try {
    localStorage.setItem(PURCHASE_TRACKED_PREFIX + orderId, '1');
  } catch {
    // Storage unavailable — nothing else to do; worst case is a
    // possible re-fire on a future visit, which is preferable to
    // throwing here.
  }
}

export function trackPurchase({ orderId, transactionId, value, tax, shipping, coupon, items }) {
  if (!orderId) return;
  if (isPurchaseAlreadyTracked(orderId)) {
    debugLog('purchase already tracked for order', orderId, '— skipped');
    return;
  }
  const builtItems = (items || []).map(i => buildItem(i.product, {
    quantity: i.quantity,
    variant: i.variant,
    discount: i.discount,
  })).filter(Boolean);
  if (!builtItems.length) return;

  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: 'INR',
    value,
    tax,
    shipping,
    coupon: coupon || undefined,
    items: builtItems,
  });
  markPurchaseTracked(orderId);
}

// ── Search ───────────────────────────────────────────────────────
export function trackSearch(searchTerm, { resultsCount, category } = {}) {
  if (!searchTerm) return;
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
    category: category || undefined,
  });
}

// ── Auth ─────────────────────────────────────────────────────────
export function trackLogin(method) {
  trackEvent('login', { method });
}

export function trackSignUp(method) {
  trackEvent('sign_up', { method });
}
