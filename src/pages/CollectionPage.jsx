import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProducts } from '../lib/api/products';
import { normalizeProducts } from '../utils/normalizeProduct';
import { filterProducts } from '../utils/filterProducts';
import ProductCard from '../components/product/ProductCard';

const CATEGORY_META = {
  rackets: {
    title: 'Rackets',
    desc: 'Professional and intermediate badminton rackets — Astrox, Arcsaber, Nanoflare, and Duora series.',
    maxPrice: 32000,
    filters: {
      'Skill Level':   ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
      'Playing Style': ['Attacking', 'Defensive', 'All-Round'],
      'Balance':       ['Head-Heavy', 'Even Balance', 'Head-Light'],
      'Flex':          ['Flexible', 'Medium', 'Medium-Stiff', 'Stiff', 'Extra Stiff'],
    },
  },
  shoes: {
    title: 'Shoes',
    desc: 'Court-optimised badminton footwear for explosive movement, superior grip and long-match endurance.',
    maxPrice: 16000,
    filters: {
      'Court Type': ['Indoor', 'All-Court', 'Hard Court'],
      'Cushioning': ['Low', 'Medium', 'High'],
      'Support':    ['Low-profile', 'Ankle Support'],
    },
  },
  bags: {
    title: 'Bags',
    desc: 'Carry your kit with confidence. From everyday backpacks to full tournament bags.',
    maxPrice: 20000,
    filters: {
      'Style':    ['Backpack', 'Duffel', 'Tour Bag', 'Sling'],
      'Capacity': ['Small', 'Medium', 'Large'],
    },
  },
  shuttlecocks: {
    title: 'Shuttlecocks',
    desc: 'From tournament feathers to durable nylon — find the right shuttle for your game.',
    maxPrice: 4000,
    filters: {
      'Type':  ['Feather', 'Nylon'],
      'Grade': ['Tournament', 'Training', 'Recreational', 'Club'],
    },
  },
  strings: {
    title: 'Strings',
    desc: 'High-performance badminton strings engineered for power, control, and durability.',
    maxPrice: 2000,
    filters: {
      'Gauge': ['0.65mm', '0.66mm', '0.68mm', '0.70mm'],
      'Feel':  ['Power', 'Control', 'Durability'],
    },
  },
  grips: {
    title: 'Grips',
    desc: 'Overgrips and replacement grips for comfort, tack, and confident handling.',
    maxPrice: 1500,
    filters: {
      'Feel':      ['Tacky', 'Dry', 'Cushioned', 'Towelling'],
      'Thickness': ['Thin (0.6mm)', 'Medium (0.7mm)', 'Thick (0.9mm+)'],
    },
  },
  apparel: {
    title: 'Apparel',
    desc: 'Performance clothing and match-day accessories engineered for the demands of competitive badminton.',
    maxPrice: 5000,
    filters: {
      'Type': ['Clothing', 'Headwear', 'Accessories'],
      'Size': ['S', 'M', 'L', 'XL', 'XXL'],
    },
  },
};

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'name-asc',   label: 'Name: A–Z' },
];

// sortProducts is pure and defined at module level - no need to memoize
function sortProducts(items, sort) {
  switch (sort) {
    case 'price-asc':  return [...items].sort((a, b) => a.price - b.price);
    case 'price-desc': return [...items].sort((a, b) => b.price - a.price);
    case 'rating':     return [...items].sort((a, b) => b.rating - a.rating);
    case 'name-asc':   return [...items].sort((a, b) => a.name.localeCompare(b.name));
    default:           return items;
  }
}

const BrandTabs = memo(function BrandTabs({ brands, active, onSelect }) {
  return (
    <div className="brand-tabs">
      <button
        className={`brand-tab ${!active ? 'brand-tab-active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {brands.map(b => (
        <button
          key={b}
          className={`brand-tab ${active === b ? 'brand-tab-active' : ''}`}
          onClick={() => onSelect(active === b ? null : b)}
        >
          {b}
        </button>
      ))}
    </div>
  );
});

export default function CollectionPage({ category: categoryProp }) {
  const { category: categoryParam } = useParams();
  const category = categoryProp || categoryParam || 'rackets';
  const meta = CATEGORY_META[category] || CATEGORY_META.rackets;

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchProducts({ category, limit: 200 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setLoadError(error.message || 'Could not load products.'); setAllProducts([]); }
        else setAllProducts(normalizeProducts(data));
      })
      .catch(err => {
        if (!cancelled) { setLoadError(err.message || 'Could not load products.'); setAllProducts([]); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  const [sort, setSort]               = useState('featured');
  const [activeFilters, setActiveFilters] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [priceRange, setPriceRange]   = useState([0, meta.maxPrice || 30000]);
  const [activeBrand, setActiveBrand] = useState(null);

  // Derive available brands dynamically from whatever products actually
  // loaded — new brands (or new products under an existing brand) show up
  // automatically here with no code change, unlike the old hardcoded
  // Yonex-only Series list this replaced.
  const availableBrands = useMemo(() => {
    if (category !== 'rackets') return [];
    return [...new Set(allProducts.map(p => p.brand).filter(Boolean))].sort();
  }, [allProducts, category]);

  const toggleFilter = (group, value) => {
    setActiveFilters(prev => {
      const current = prev[group] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [group]: updated.length ? updated : undefined };
    });
  };

  const activeCount = Object.values(activeFilters).flat().filter(Boolean).length
    + (activeBrand ? 1 : 0);

  const clearAll = () => {
    setActiveFilters({});
    setActiveBrand(null);
    setPriceRange([0, meta.maxPrice || 30000]);
  };

  const filtered = useMemo(() => {
    // Merge the brand tab into filter state for unified logic
    const effectiveFilters = { ...activeFilters };
    if (activeBrand) effectiveFilters['Brand'] = [activeBrand];
    return filterProducts(allProducts, effectiveFilters, priceRange);
  }, [allProducts, activeFilters, priceRange, activeBrand]);

  const displayed = sortProducts(filtered, sort);

  return (
    <div className="col-page">
      {/* Hero bar */}
      <div className="col-hero">
        <div className="container">
          <div className="t-label" style={{ color: 'var(--gr-2)', marginBottom: 8 }}>
            <Link to="/">Home</Link> / {meta.title}
          </div>
          <h1 className="t-h1">{meta.title}</h1>
          <p className="t-body" style={{ marginTop: 8, maxWidth: 520 }}>{meta.desc}</p>
        </div>
      </div>

      {/* Brand tabs — rackets only, computed dynamically from live product data */}
      {category === 'rackets' && availableBrands.length > 0 && (
        <div className="col-brand-bar">
          <div className="container">
            <BrandTabs
              brands={availableBrands}
              active={activeBrand}
              onSelect={setActiveBrand}
            />
          </div>
        </div>
      )}

      <div className="container">
        {/* Toolbar */}
        <div className="col-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-outline btn-sm col-filter-toggle"
              onClick={() => setSidebarOpen(s => !s)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
              Filters
              {activeCount > 0 && (
                <span className="badge badge-navy" style={{ marginLeft: 4 }}>{activeCount}</span>
              )}
            </button>
            <span className="t-small">{loading ? 'Loading…' : `${displayed.length} product${displayed.length !== 1 ? 's' : ''}`}</span>
            {activeCount > 0 && (
              <button className="t-small col-clear-link" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          <select className="select col-sort" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="col-layout">
          {/* Filter Sidebar — a fixed drawer on mobile (see .col-sidebar
              media query below), an inline column on desktop; same
              component and state either way, no separate mobile code path. */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  className="col-sidebar-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: .2 }}
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.aside
                  className="col-sidebar"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: .22 }}
                >
                  <div className="col-sidebar-mobile-head">
                    <span className="t-h4">Filters</span>
                    <button className="col-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close filters">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                {Object.entries(meta.filters).map(([group, values]) => (
                  <div key={group} className="filter-group">
                    <div className="filter-group-head">{group}</div>
                    {values.map(v => {
                      const active = (activeFilters[group] || []).includes(v);
                      return (
                        <label key={v} className={`filter-option ${active ? 'filter-option-active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleFilter(group, v)}
                            className="filter-check"
                          />
                          <span>{v}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}

                {/* Price range */}
                <div className="filter-group">
                  <div className="filter-group-head">Price</div>
                  <div className="filter-price-row">
                    <span className="t-small">₹{priceRange[0].toLocaleString('en-IN')}</span>
                    <span className="t-small">₹{priceRange[1].toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={meta.maxPrice || 30000}
                    step={500}
                    value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], +e.target.value])}
                    className="filter-range"
                  />
                </div>

                {activeCount > 0 && (
                  <button
                    className="btn btn-outline btn-sm btn-full"
                    style={{ marginTop: 8 }}
                    onClick={clearAll}
                  >
                    Clear all filters
                  </button>
                )}
              </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Product Grid */}
          <div className={`col-grid ${sidebarOpen ? 'col-grid-narrow' : 'col-grid-wide'}`}>
            {loading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="pcard-skeleton">
                    <div className="pcard-skeleton-img" />
                    <div className="pcard-skeleton-line" style={{ width: '70%' }} />
                    <div className="pcard-skeleton-line" style={{ width: '40%' }} />
                  </div>
                ))}
              </>
            ) : loadError ? (
              <div className="col-empty">
                <p className="t-h4">Couldn't load products</p>
                <p className="t-body" style={{ marginTop: 8 }}>{loadError}</p>
              </div>
            ) : displayed.length === 0 ? (
              <div className="col-empty">
                <p className="t-h4">No products match your filters</p>
                <p className="t-body" style={{ marginTop: 8 }}>
                  Try adjusting or clearing your selection.
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={clearAll}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              displayed.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
            )}
          </div>
        </div>
      </div>

      <style>{`
        .col-page { padding-bottom: 80px; }
        .col-hero { padding:48px 0 36px; border-bottom:1px solid var(--gr-5); }
        .col-brand-bar { border-bottom:1px solid var(--gr-5); background:var(--gr-6); }
        .brand-tabs { display:flex; gap:4px; padding:12px 0; overflow-x:auto; }
        .brand-tab { padding:7px 16px; font-size:12px; font-weight:600; letter-spacing:.04em; border:1.5px solid var(--gr-4); border-radius:100px; background:transparent; color:var(--bk); transition:var(--trans); white-space:nowrap; }
        .brand-tab:hover { border-color:var(--bk); }
        .brand-tab-active { background:var(--bk); color:var(--wh); border-color:var(--bk); }
        .col-toolbar { display:flex; align-items:center; justify-content:space-between; padding:16px 0; border-bottom:1px solid var(--gr-5); margin-bottom:24px; }
        .col-filter-toggle { display:flex; align-items:center; gap:8px; }
        .col-sort { width:200px; font-size:12px; padding:8px 32px 8px 12px; }
        .col-clear-link { font-size:11px; color:var(--gr-2); text-decoration:underline; background:none; border:none; cursor:pointer; padding:0; }
        .col-clear-link:hover { color:var(--bk); }
        .col-layout { display:flex; gap:32px; align-items:flex-start; }
        .col-sidebar { width:220px; flex-shrink:0; padding-top:4px; }
        .col-sidebar-backdrop { display:none; }
        .col-sidebar-mobile-head { display:none; }
        .col-sidebar-close { display:none; }
        @media(max-width:860px){
          .col-grid-narrow,.col-grid-wide{grid-template-columns:repeat(2,1fr);}

          /* Filters become a fixed drawer sliding in from the left with
             a tap-to-close backdrop, instead of being hidden entirely
             (the old behaviour left mobile visitors with no way to
             filter at all). Same component, same state — only the
             positioning changes at this breakpoint. */
          .col-sidebar {
            display:block;
            position:fixed; top:0; left:0; bottom:0;
            width:82vw; max-width:340px;
            background:var(--wh);
            z-index:200;
            padding:20px;
            overflow-y:auto;
            box-shadow:var(--shadow-md);
          }
          .col-sidebar-backdrop {
            display:block;
            position:fixed; inset:0;
            background:rgba(0,0,0,.4);
            z-index:190;
          }
          .col-sidebar-mobile-head {
            display:flex; align-items:center; justify-content:space-between;
            margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--gr-5);
          }
          .col-sidebar-close {
            display:flex; align-items:center; justify-content:center;
            width:32px; height:32px; border-radius:50%; color:var(--gr-1);
          }
          .col-sidebar-close:hover { background:var(--gr-6); }
          /* The grid never needs the "narrow" variant on mobile — the
             drawer floats above the page rather than sharing layout
             width with it. */
          .col-grid-narrow { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:480px){
          .col-grid-narrow,.col-grid-wide{grid-template-columns:1fr 1fr; gap:14px;}
        }

        .col-grid { flex:1; display:grid; gap:24px; }
        .col-grid-narrow { grid-template-columns:repeat(3,1fr); }
        .col-grid-wide   { grid-template-columns:repeat(4,1fr); }
        .col-empty { grid-column:1/-1; text-align:center; padding:64px 0; }

        /* Loading skeleton — mirrors .pcard's aspect-ratio:1 image area
           so the grid doesn't jump in height once real cards replace it. */
        .pcard-skeleton { display:flex; flex-direction:column; gap:10px; }
        .pcard-skeleton-img { aspect-ratio:1; border-radius:var(--r-sm); background:var(--gr-6); overflow:hidden; position:relative; }
        .pcard-skeleton-line { height:12px; border-radius:4px; background:var(--gr-6); overflow:hidden; position:relative; }
        .pcard-skeleton-img::after, .pcard-skeleton-line::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
          animation: pcard-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes pcard-shimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(100%);} }
        @media (prefers-reduced-motion: reduce) {
          .pcard-skeleton-img::after, .pcard-skeleton-line::after { animation: none; }
        }
        .filter-group { margin-bottom:24px; }
        .filter-group-head { font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--gr-2); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--gr-5); }
        .filter-option { display:flex; align-items:center; gap:10px; padding:5px 0; font-size:13px; cursor:pointer; color:var(--gr-1); }
        .filter-option:hover, .filter-option-active { color:var(--bk); }
        .filter-option-active { font-weight:500; }
        .filter-check { width:14px; height:14px; accent-color:var(--cr); cursor:pointer; flex-shrink:0; }
        .filter-price-row { display:flex; justify-content:space-between; margin-bottom:8px; }
        .filter-range { width:100%; accent-color:var(--cr); cursor:pointer; }
        @media(max-width:1100px){ .col-grid-narrow{grid-template-columns:repeat(2,1fr);} .col-grid-wide{grid-template-columns:repeat(3,1fr);} }
                @media(max-width:540px){ .col-grid-narrow,.col-grid-wide{grid-template-columns:1fr 1fr; gap:12px;} }
      `}</style>
    </div>
  );
}
