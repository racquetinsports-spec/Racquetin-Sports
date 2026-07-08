import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Nav from './components/nav/Nav';
import CartDrawer from './components/cart/CartDrawer';
import SearchOverlay from './components/ui/SearchOverlay';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';           // NOT lazy — above the fold, must be immediate
import { useSiteContent, pick } from './hooks/useSiteContent';
import './styles/global.css';

// ── Lazy-load all non-home pages ─────────────────────────────────
// Each page becomes a separate chunk, downloaded only when first visited.
// This halves the initial JS parse time on the home page.
const CollectionPage    = lazy(() => import('./pages/CollectionPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage          = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.CartPage })));
const CheckoutPage      = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.OrderConfirmationPage })));
const WishlistPage      = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.WishlistPage })));
const SearchPage        = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.SearchPage })));
const AboutPage         = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.AboutPage })));
const PrivacyPolicyPage  = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage          = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.TermsPage })));
const AccountPage       = lazy(() => import('./pages/OtherPages').then(m => ({ default: m.AccountPage })));
const LoginPage         = lazy(() => import('./pages/auth/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage      = lazy(() => import('./pages/auth/AuthPages').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/AuthPages').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import('./pages/auth/AuthPages').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallback       = lazy(() => import('./pages/auth/AuthPages').then(m => ({ default: m.AuthCallback })));

// ── Page transition variants ──────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -8 },
};
const pageTransition = { duration: .3, ease: [.16, 1, .3, 1] };

// ── Minimal fallback shown while lazy chunks load ─────────────────
const PageFallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
);

function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

function shadeHexColor(hex, amount) {
  try {
    let col = hex.replace('#', '');
    if (col.length === 3) col = col.split('').map(c => c + c).join('');
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  } catch {
    return hex;
  }
}

export default function App() {
  const location = useLocation();
  const isHome   = location.pathname === '/';
  const { settings, loading: settingsLoading } = useSiteContent();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Brand color + SEO — driven by Settings once loaded, falling back to
  // the existing hardcoded navy/meta tags if a field isn't set yet.
  // Purely a CSS-variable/meta-tag side effect: does not touch the hero
  // component, typography, or any layout markup.
  useEffect(() => {
    if (settingsLoading) return;
    const root = document.documentElement.style;
    const primary = pick(settings.primary_color, null);
    if (primary) {
      root.setProperty('--cr', primary);
      root.setProperty('--cr-dim', shadeHexColor(primary, -30));
      root.setProperty('--cr-lt', shadeHexColor(primary, 30));
    }
    const secondary = pick(settings.secondary_color, null);
    if (secondary) root.setProperty('--secondary', secondary);

    const title = pick(settings.meta_title, null);
    if (title) document.title = title;
    const description = pick(settings.meta_description, null);
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) { tag = document.createElement('meta'); tag.name = 'description'; document.head.appendChild(tag); }
      tag.setAttribute('content', description);
    }
  }, [settings, settingsLoading]);

  return (
    <>
      <Nav isHeroPage={isHome} />
      <CartDrawer />
      <SearchOverlay />

      <main style={{ paddingTop: isHome ? 0 : 62 }}>
        <Suspense fallback={<PageFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"            element={<HomePage />} />

              <Route path="/rackets"      element={<PageWrapper><CollectionPage category="rackets" /></PageWrapper>} />
              <Route path="/shoes"        element={<PageWrapper><CollectionPage category="shoes" /></PageWrapper>} />
              <Route path="/bags"         element={<PageWrapper><CollectionPage category="bags" /></PageWrapper>} />
              <Route path="/shuttlecocks" element={<PageWrapper><CollectionPage category="shuttlecocks" /></PageWrapper>} />
              <Route path="/strings"      element={<PageWrapper><CollectionPage category="strings" /></PageWrapper>} />
              <Route path="/grips"        element={<PageWrapper><CollectionPage category="grips" /></PageWrapper>} />
              <Route path="/apparel"      element={<PageWrapper><CollectionPage category="apparel" /></PageWrapper>} />
              <Route path="/product/:id"  element={<PageWrapper><ProductDetailPage /></PageWrapper>} />
              <Route path="/about"        element={<PageWrapper><AboutPage /></PageWrapper>} />
              <Route path="/privacy-policy" element={<PageWrapper><PrivacyPolicyPage /></PageWrapper>} />
              <Route path="/terms-and-conditions" element={<PageWrapper><TermsPage /></PageWrapper>} />
              <Route path="/cart"         element={<PageWrapper><CartPage /></PageWrapper>} />
              <Route path="/checkout"     element={<PageWrapper><CheckoutPage /></PageWrapper>} />
              <Route path="/order-confirmation/:orderId" element={<PageWrapper><OrderConfirmationPage /></PageWrapper>} />
              <Route path="/wishlist"     element={<PageWrapper><WishlistPage /></PageWrapper>} />
              <Route path="/search"       element={<PageWrapper><SearchPage /></PageWrapper>} />
              <Route path="/account"      element={<PageWrapper><AccountPage /></PageWrapper>} />

              {/* ── Auth routes ───────────────────────────────── */}
              <Route path="/auth/login"           element={<LoginPage />} />
              <Route path="/auth/register"        element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password"  element={<ResetPasswordPage />} />
              <Route path="/auth/callback"        element={<AuthCallback />} />

              <Route path="*" element={
                <PageWrapper>
                  <div className="container" style={{ padding: '80px 48px', textAlign: 'center' }}>
                    <h1 className="t-h1">404 — Page Not Found</h1>
                    <a href="/" className="btn btn-primary" style={{ marginTop: 24 }}>Back to Home</a>
                  </div>
                </PageWrapper>
              } />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isHome && <Footer />}
      {isHome && (
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Footer />
        </div>
      )}
    </>
  );
}
