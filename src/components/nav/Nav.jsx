import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

const NAV_LINKS = [
  {
    label: 'Rackets',
    href: '/rackets',
    mega: {
      cols: [
        {
          heading: 'Shop by Series',
          links: [
            { label: 'R7 Pro Series',   href: '/rackets?series=r7' },
            { label: 'Aero Series',     href: '/rackets?series=aero' },
            { label: 'Control Series',  href: '/rackets?series=control' },
            { label: 'Junior Series',   href: '/rackets?series=junior' },
            { label: 'View All Rackets', href: '/rackets', accent: true },
          ],
        },
        {
          heading: 'Shop by Level',
          links: [
            { label: 'Professional', href: '/rackets?level=professional' },
            { label: 'Advanced',     href: '/rackets?level=advanced' },
            { label: 'Intermediate', href: '/rackets?level=intermediate' },
            { label: 'Beginner',     href: '/rackets?level=beginner' },
            { label: 'Junior',       href: '/rackets?level=junior' },
          ],
        },
      ],
      featured: {
        name: 'R7 Elite',
        tagline: 'Tournament grade. Uncompromised.',
        href: '/product/r7-elite',
      },
    },
  },
  {
    label: 'Shoes',
    href: '/shoes',
    mega: {
      cols: [
        {
          heading: 'Collections',
          links: [
            { label: 'CourtDrive Pro',  href: '/product/courtdrive-pro' },
            { label: 'AeroStep Elite',  href: '/product/aerostep-elite' },
            { label: 'GripCourt Max',   href: '/product/gripcourt-max' },
            { label: 'View All Shoes',  href: '/shoes', accent: true },
          ],
        },
        {
          heading: 'By Court Type',
          links: [
            { label: 'Indoor Courts', href: '/shoes?court=indoor' },
            { label: 'All-Court',     href: '/shoes?court=all' },
            { label: 'Hard Court',    href: '/shoes?court=hard' },
          ],
        },
      ],
      featured: {
        name: 'CourtDrive Pro',
        tagline: 'Explosive lateral movement.',
        href: '/product/courtdrive-pro',
      },
    },
  },
  { label: 'Bags',         href: '/bags' },
  { label: 'Shuttlecocks', href: '/shuttlecocks' },
  { label: 'Strings',      href: '/strings' },
  { label: 'Grips',        href: '/grips' },
  {
    label: 'Apparel',
    href: '/apparel',
    mega: {
      cols: [
        {
          heading: 'Clothing',
          links: [
            { label: 'Performance Jersey',  href: '/product/performance-jersey' },
            { label: 'Match Polo',          href: '/product/match-polo' },
            { label: 'Performance Hoodie',  href: '/product/performance-hoodie' },
            { label: 'Tournament Shorts',   href: '/product/tournament-shorts' },
            { label: 'View All Apparel',    href: '/apparel', accent: true },
          ],
        },
        {
          heading: 'Accessories',
          links: [
            { label: 'Wrist Bands',   href: '/apparel?type=wristband' },
            { label: 'Dampener Pack', href: '/apparel?type=dampener' },
            { label: 'Premium Towel', href: '/apparel?type=towel' },
            { label: 'Court Socks',   href: '/apparel?type=socks' },
          ],
        },
      ],
      featured: {
        name: 'Performance Hoodie',
        tagline: 'Off-court comfort, on-brand style.',
        href: '/product/performance-hoodie',
      },
    },
  },
];

export default function Nav({ isHeroPage = false }) {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count: cartCount } = useCart();
  const openCart = useUIStore(s => s.openCart);
  const { ids: wishIds } = useWishlist();
  const openSearch = useUIStore(s => s.openSearch);
  const megaMenu   = useUIStore(s => s.megaMenu);
  const setMegaMenu = useUIStore(s => s.setMegaMenu);
  const leaveTimer = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

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
            {NAV_LINKS.map(link => (
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
            <button className="nav-icon-btn" onClick={openSearch} aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <Link to="/account" className="nav-icon-btn" aria-label="Account">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </Link>
            <Link to="/wishlist" className="nav-icon-btn" aria-label="Wishlist">
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
            const active = NAV_LINKS.find(l => l.label === megaMenu);
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
          <motion.div
            className="mobile-nav"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: .3, ease: [.16,1,.3,1] }}
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
            {NAV_LINKS.map(l => (
              <Link key={l.label} to={l.href} className="mobile-link" onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="mobile-nav-footer">
              <Link to="/account" onClick={() => setMobileOpen(false)}>Account</Link>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)}>Wishlist</Link>
            </div>
          </motion.div>
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
          .nav-logo-img { height: 46px; }
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

        /* Mobile */
        .mobile-nav { position:fixed; inset:0; z-index:500; background:var(--wh); display:flex; flex-direction:column; padding:20px; }
        .mobile-nav-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; }
        .mobile-close { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; transition:background .2s; }
        .mobile-close:hover { background:var(--gr-6); }
        .mobile-link { display:block; font-size:22px; font-weight:600; letter-spacing:-.02em; padding:12px 0; border-bottom:1px solid var(--gr-5); }
        .mobile-nav-footer { display:flex; gap:24px; margin-top:auto; font-size:13px; color:var(--gr-2); }

        @media(max-width:860px){ .nav-links{display:none;} .nav-hamburger{display:flex;} }
      `}</style>
    </>
  );
}
