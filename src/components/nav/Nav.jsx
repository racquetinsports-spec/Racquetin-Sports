import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { fetchBrandsByCategory } from '../../lib/api/products';

// Every top-level nav category. Their dropdown content (below) is built
// from live product data — no hardcoded series/product names, so it
// can never drift out of sync with what's actually in the catalogue.
// "Accessories" isn't a distinct catalogue category (it's a tag inside
// Apparel), so its real brands surface through the Apparel dropdown.
const CATEGORY_LINKS = [
  { label: 'Rackets',      href: '/rackets',      slug: 'rackets' },
  { label: 'Shoes',        href: '/shoes',        slug: 'shoes' },
  { label: 'Bags',         href: '/bags',         slug: 'bags' },
  { label: 'Shuttlecocks', href: '/shuttlecocks', slug: 'shuttlecocks' },
  { label: 'Strings',      href: '/strings',      slug: 'strings' },
  { label: 'Grips',        href: '/grips',        slug: 'grips' },
  { label: 'Apparel',      href: '/apparel',      slug: 'apparel' },
];

// Real, catalogue-independent skill-level values (these map directly to
// the "Skill Level" filter on the Rackets collection page — not a
// stand-in for real product data, so this one stays static).
const RACKET_LEVELS = ['Professional', 'Advanced', 'Intermediate', 'Beginner'];

export default function Nav({ isHeroPage = false }) {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobileCat, setExpandedMobileCat] = useState(null);
  const { count: cartCount } = useCart();
  const openCart = useUIStore(s => s.openCart);
  const { ids: wishIds } = useWishlist();
  const openSearch = useUIStore(s => s.openSearch);
  const megaMenu   = useUIStore(s => s.megaMenu);
  const setMegaMenu = useUIStore(s => s.setMegaMenu);
  const leaveTimer = useRef(null);

  // Brands actually present in the live catalogue, per category —
  // fetched once and used to build every dropdown (desktop mega menu
  // and the mobile drawer's expandable categories) from the same data.
  const [brandsByCategory, setBrandsByCategory] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetchBrandsByCategory(CATEGORY_LINKS.map(c => c.slug))
      .then(({ data }) => { if (!cancelled) setBrandsByCategory(data || {}); })
      .catch(() => { if (!cancelled) setBrandsByCategory({}); });
    return () => { cancelled = true; };
  }, []);

  // Build each category's dropdown from live brands. A category with no
  // active branded products (empty result) simply gets no dropdown —
  // it stays a plain link rather than showing an empty menu.
  const navItems = useMemo(() => CATEGORY_LINKS.map(cat => {
    const brands = brandsByCategory[cat.slug] || [];
    if (brands.length === 0 && cat.slug !== 'rackets') return { ...cat, mega: null };

    const cols = [];
    if (cat.slug === 'rackets') {
      cols.push({
        heading: 'Shop by Level',
        links: RACKET_LEVELS.map(level => ({
          label: level,
          href: `/rackets?level=${encodeURIComponent(level.toLowerCase())}`,
        })),
      });
    }
    if (brands.length > 0) {
      cols.push({
        heading: 'Shop by Brand',
        links: [
          ...brands.map(b => ({ label: b, href: `${cat.href}?brand=${encodeURIComponent(b)}` })),
          { label: `View All ${cat.label}`, href: cat.href, accent: true },
        ],
      });
    }
    return cols.length ? { ...cat, mega: { cols } } : { ...cat, mega: null };
  }), [brandsByCategory]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  // Collapse the expanded category and mega menu whenever the drawer closes.
  useEffect(() => {
    if (!mobileOpen) setExpandedMobileCat(null);
  }, [mobileOpen]);

  const handleMegaEnter = (label) => {
    clearTimeout(leaveTimer.current);
    setMegaMenu(label);
  };
  const handleMegaLeave = () => {
    leaveTimer.current = setTimeout(() => setMegaMenu(null), 120);
  };

  const isLight = isHeroPage && !scrolled;

  return (
    <>
      <header className={`nav-shell ${scrolled ? 'nav-scrolled' : ''} ${isLight ? 'nav-light' : ''}`}>
        <div className="nav-inner container">
          {/* Logo */}
          <Link to="/" className="nav-logo" onClick={() => setMegaMenu(null)}>
            <img src="/images/logo-racquetin.png" alt="RacquetIn" className="nav-logo-img" />
          </Link>

          {/* Main links */}
          <nav className="nav-links" onMouseLeave={handleMegaLeave}>
            {navItems.map(link => (
              <div
                key={link.label}
                className={`nav-item ${megaMenu === link.label ? 'nav-item-active' : ''}`}
                onMouseEnter={() => link.mega ? handleMegaEnter(link.label) : setMegaMenu(null)}
              >
                <Link to={link.href} className="nav-link" onClick={() => setMegaMenu(null)}>
                  {link.label}
                </Link>
              </div>
            ))}
          </nav>

          {/* Right icons */}
          <div className="nav-right">
            <button className="nav-icon-btn nav-icon-search" onClick={openSearch} aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <Link to="/account" className="nav-icon-btn" aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </Link>
            <Link to="/wishlist" className="nav-icon-btn nav-icon-wishlist" aria-label="Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {wishIds.length > 0 && <span className="nav-badge">{wishIds.length}</span>}
            </Link>
            <button className="nav-icon-btn" onClick={openCart} aria-label="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
            </button>
            <button className="nav-hamburger" onClick={() => setMobileOpen(m => !m)} aria-label="Menu">
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Mega Menu */}
        <AnimatePresence>
          {megaMenu && (() => {
            const active = navItems.find(l => l.label === megaMenu);
            if (!active?.mega) return null;
            return (
              <motion.div
                key="mega"
                className="mega-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: .18, ease: [.16,1,.3,1] }}
                onMouseEnter={() => clearTimeout(leaveTimer.current)}
                onMouseLeave={handleMegaLeave}
              >
                <div className="mega-inner container">
                  {active.mega.cols.map(col => (
                    <div key={col.heading} className="mega-col">
                      <div className="mega-heading">{col.heading}</div>
                      {col.links.map(l => (
                        <Link
                          key={l.label}
                          to={l.href}
                          className={`mega-link ${l.accent ? 'mega-link-accent' : ''}`}
                          onClick={() => setMegaMenu(null)}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {active.mega.featured && (
                    <div className="mega-featured">
                      <div className="mega-feat-label">Featured</div>
                      <Link
                        to={active.mega.featured.href}
                        className="mega-feat-card"
                        onClick={() => setMegaMenu(null)}
                      >
                        <div className="mega-feat-img" />
                        <div className="mega-feat-name">{active.mega.featured.name}</div>
                        <div className="mega-feat-tag">{active.mega.featured.tagline}</div>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="mobile-nav"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: .32, ease: [.16,1,.3,1] }}
            >
              <div className="mobile-nav-header">
                <Link to="/" className="nav-logo" onClick={() => setMobileOpen(false)}>
                  <img src="/images/logo-racquetin.png" alt="RacquetIn" className="nav-logo-img" />
                </Link>
                <button onClick={() => setMobileOpen(false)} className="mobile-close" aria-label="Close menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <button
                className="mobile-search-btn"
                onClick={() => { setMobileOpen(false); openSearch(); }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Search
              </button>

              <div className="mobile-nav-scroll">
                <nav className="mobile-nav-links">
                  {navItems.map(item => {
                    const expanded = expandedMobileCat === item.label;
                    const hasBrands = !!item.mega;
                    return (
                      <div key={item.label} className="mobile-cat">
                        <div className="mobile-cat-row">
                          <Link
                            to={item.href}
                            className="mobile-link"
                            onClick={() => setMobileOpen(false)}
                          >
                            {item.label}
                          </Link>
                          {hasBrands && (
                            <button
                              className={`mobile-cat-toggle ${expanded ? 'mobile-cat-toggle-open' : ''}`}
                              onClick={() => setExpandedMobileCat(expanded ? null : item.label)}
                              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label}`}
                              aria-expanded={expanded}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M6 9l6 6 6-6"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {hasBrands && expanded && (
                            <motion.div
                              className="mobile-subpanel"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: .25, ease: [.16,1,.3,1] }}
                            >
                              {item.mega.cols.map(col => (
                                <div key={col.heading} className="mobile-subgroup">
                                  <div className="mobile-subgroup-head">{col.heading}</div>
                                  {col.links.map(l => (
                                    <Link
                                      key={l.label}
                                      to={l.href}
                                      className={`mobile-sublink ${l.accent ? 'mobile-sublink-accent' : ''}`}
                                      onClick={() => setMobileOpen(false)}
                                    >
                                      {l.label}
                                    </Link>
                                  ))}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>
              </div>

              <div className="mobile-nav-footer">
                <Link to="/account" onClick={() => setMobileOpen(false)}>Account</Link>
                <Link to="/wishlist" onClick={() => setMobileOpen(false)}>
                  Wishlist{wishIds.length > 0 ? ` (${wishIds.length})` : ''}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .nav-shell {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--gr-5);
          transition: border-color .3s, background .3s;
        }
        .nav-shell.nav-light { background: transparent; border-bottom-color: transparent; }
        .nav-shell.nav-scrolled { background: rgba(255,255,255,.98); border-bottom-color: var(--gr-5); }
        .nav-inner { display:flex; align-items:center; justify-content:space-between; height:84px; }

        /* Logo */
        .nav-logo { display:flex; align-items:center; flex-shrink:0; }
        .nav-logo-img {
          height: 68px;
          width: auto;      /* never distort aspect ratio — height-only constraint */
          max-width: none;  /* overrides the global img{max-width:100%} reset in global.css,
                                which was silently capping this image's rendered width based
                                on its flex parent — the actual reason prior height increases
                                produced no visible change regardless of the value used. */
          display: block;
        }
        @media(max-width:640px){
          /* Fluid instead of a flat px value — scales with the icons
             that were freed up below (search/wishlist moved into the
             drawer) instead of a fixed number that either overflowed
             narrow phones or looked too small on larger ones. */
          .nav-logo-img { height: clamp(40px, 12vw, 56px); }
        }

        /* Links */
        .nav-links { display:flex; align-items:center; gap:2px; }
        .nav-item { position:relative; }
        .nav-link { display:block; padding:8px 14px; font-size:12px; font-weight:500; letter-spacing:.04em; color:var(--bk); opacity:.7; transition:opacity .2s; }
        .nav-link:hover, .nav-item-active .nav-link { opacity:1; }

        /* Icons */
        .nav-right { display:flex; align-items:center; gap:4px; }
        .nav-icon-btn { position:relative; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; color:var(--bk); transition:background .2s; }
        .nav-icon-btn:hover { background:var(--gr-6); }
        .nav-badge { position:absolute; top:4px; right:4px; min-width:15px; height:15px; padding:0 3px; background:var(--cr); color:#fff; font-size:9px; font-weight:700; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .nav-hamburger { display:none; flex-direction:column; gap:5px; padding:8px; }
        .nav-hamburger span { display:block; width:20px; height:1.5px; background:var(--bk); border-radius:1px; }

        /* On phones, search and wishlist move into the drawer (Search
           button up top, Wishlist in the footer) so the header only
           ever has to fit: hamburger, logo, cart, account — which is
           what leaves the logo above real room to be bigger. */
        @media(max-width:640px){
          .nav-icon-search, .nav-icon-wishlist { display:none; }
        }

        /* Mega */
        .mega-menu { position:absolute; top:100%; left:0; right:0; background:var(--wh); border-bottom:1px solid var(--gr-5); box-shadow:var(--shadow-md); z-index:199; }
        .mega-inner { display:flex; gap:48px; padding:32px 48px; }
        .mega-col { min-width:160px; }
        .mega-heading { font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--gr-2); margin-bottom:14px; }
        .mega-link { display:block; font-size:13px; color:var(--bk); padding:5px 0; opacity:.75; transition:opacity .15s; }
        .mega-link:hover { opacity:1; }
        .mega-link-accent { color:var(--cr); opacity:1; font-weight:500; margin-top:6px; }
        .mega-featured { margin-left:auto; min-width:180px; }
        .mega-feat-label { font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--gr-2); margin-bottom:12px; }
        .mega-feat-card { display:block; }
        .mega-feat-img { width:100%; aspect-ratio:1; background:var(--gr-6); border-radius:var(--r); margin-bottom:10px; }
        .mega-feat-name { font-size:13px; font-weight:600; margin-bottom:3px; }
        .mega-feat-tag { font-size:12px; color:var(--gr-2); }

        /* Mobile drawer */
        .mobile-nav-backdrop { position:fixed; inset:0; z-index:499; background:rgba(0,0,0,.4); }
        .mobile-nav {
          position:fixed; top:0; right:0; bottom:0; z-index:500;
          width:88vw; max-width:400px;
          background:var(--wh);
          display:flex; flex-direction:column;
          padding:20px 20px calc(20px + env(safe-area-inset-bottom));
          padding-top:calc(20px + env(safe-area-inset-top));
          box-shadow:var(--shadow-md);
        }
        .mobile-nav-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-shrink:0; }
        .mobile-close { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; transition:background .2s; flex-shrink:0; }
        .mobile-close:hover, .mobile-close:active { background:var(--gr-6); }

        .mobile-search-btn {
          display:flex; align-items:center; gap:10px;
          width:100%; padding:13px 16px; margin-bottom:24px;
          background:var(--gr-6); border-radius:100px;
          font-size:14px; font-weight:500; color:var(--gr-1);
          transition:background .2s; flex-shrink:0;
        }
        .mobile-search-btn:hover, .mobile-search-btn:active { background:var(--gr-5); color:var(--bk); }

        .mobile-nav-scroll { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; margin:0 -20px; padding:0 20px; }
        .mobile-nav-links { display:flex; flex-direction:column; }

        .mobile-cat { border-bottom:1px solid var(--gr-5); }
        .mobile-cat-row { display:flex; align-items:stretch; }
        .mobile-link {
          flex:1; display:flex; align-items:center;
          font-size:19px; font-weight:600; letter-spacing:-.02em;
          padding:16px 0; min-height:56px;              /* large tap target */
          color:var(--bk);
        }
        .mobile-cat-toggle {
          display:flex; align-items:center; justify-content:center;
          width:48px; height:56px; flex-shrink:0;         /* large tap target */
          color:var(--gr-2); transition:color .2s, transform .25s cubic-bezier(.16,1,.3,1);
        }
        .mobile-cat-toggle svg { transition:transform .25s cubic-bezier(.16,1,.3,1); }
        .mobile-cat-toggle-open { color:var(--bk); }
        .mobile-cat-toggle-open svg { transform:rotate(180deg); }

        .mobile-subpanel { overflow:hidden; }
        .mobile-subgroup { padding:2px 0 16px; }
        .mobile-subgroup-head { font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--gr-3); margin:10px 0 8px; }
        .mobile-sublink {
          display:flex; align-items:center;
          font-size:15px; color:var(--gr-1);
          padding:10px 4px; min-height:40px;               /* large tap target */
          border-radius:var(--r-sm);
          transition:background .15s, color .15s;
        }
        .mobile-sublink:active { background:var(--gr-6); }
        .mobile-sublink-accent { color:var(--cr); font-weight:600; }

        .mobile-nav-footer {
          display:flex; gap:28px; flex-shrink:0;
          padding-top:16px; margin-top:8px;
          border-top:1px solid var(--gr-5);
          font-size:13px; font-weight:500; letter-spacing:.02em; color:var(--gr-2);
        }
        .mobile-nav-footer a:hover, .mobile-nav-footer a:active { color:var(--bk); }

        @media(max-width:860px){ .nav-links{display:none;} .nav-hamburger{display:flex;} }
        @media(max-width:420px){ .mobile-nav{ width:100vw; max-width:none; } }
      `}</style>
    </>
  );
}
