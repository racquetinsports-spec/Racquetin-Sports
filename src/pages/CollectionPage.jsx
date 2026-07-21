import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProducts } from '../lib/api/products';
import { normalizeProducts } from '../utils/normalizeProduct';
import { filterProducts } from '../utils/filterProducts';
import { sortBrands } from '../utils/brandOrder';
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

// Filter groups whose options are mutually exclusive (a product only
// ever has one skill level, so letting three checkboxes be active at
// once just produced a match-none result). Keyed by category so a
// future category can opt in without touching the render logic.
// Multi-select groups (Brand, Size, Color, etc.) are untouched.
const SINGLE_SELECT_GROUPS = {
  rackets: ['Skill Level'],
};

const isSingleSelectGroup = (category, group) =>
  (SINGLE_SELECT_GROUPS[category] || []).includes(group);

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
  const [searchParams] = useSearchParams();
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
  // Sidebar defaults open on desktop (unchanged prior behaviour — it's
  // just an inline column there) but closed on mobile, where it's now a
  // fixed drawer that would otherwise cover the whole screen on load.
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 860 : true);
  const [priceRange, setPriceRange]   = useState([0, meta.maxPrice || 30000]);
  const [activeBrand, setActiveBrand] = useState(null);

  // Derive available brands dynamically from whatever products actually
  // loaded — new brands (or new products under an existing brand) show up
  // automatically here with no code change, unlike the old hardcoded
  // Yonex-only Series list this replaced.
  const availableBrands = useMemo(() => {
    if (category !== 'rackets') return [];
    return sortBrands(allProducts.map(p => p.brand));
  }, [allProducts, category]);

  const toggleFilter = (group, value) => {
    setActiveFilters(prev => {
      // Single-select groups (e.g. Skill Level) always replace whatever
      // was selected — no accumulating multiple mutually-exclusive values.
      if (isSingleSelectGroup(category, group)) {
        return { ...prev, [group]: [value] };
      }
      const current = prev[group] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [group]: updated.length ? updated : undefined };
    });
  };

  // "All" option for single-select groups — clears just that group.
  const clearGroupFilter = (group) => {
    setActiveFilters(prev => {
      const next = { ...prev };
      delete next[group];
      return next;
    });
  };

  // Preset filters from the URL (?brand=, ?level=) so links from the
  // nav's "Shop by Brand"/"Shop by Level" dropdowns land with the
  // right filter already applied, instead of just landing on the
  // unfiltered category page. Re-runs whenever the category or query
  // string changes (e.g. clicking a different brand link while
  // already on this category).
  useEffect(() => {
    const brandParam = searchParams.get('brand');
    const levelParam = searchParams.get('level');

    if (brandParam) {
      if (category === 'rackets') {
        setActiveBrand(brandParam);
      } else {
        setActiveFilters(prev => ({ ...prev, Brand: [brandParam] }));
      }
    }

    if (levelParam && meta.filters['Skill Level']) {
      const canonical = meta.filters['Skill Level'].find(
        v => v.toLowerCase() === levelParam.toLowerCase()
      );
      if (canonical) {
        setActiveFilters(prev => ({ ...prev, 'Skill Level': [canonical] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchParams]);

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
              component and state either way. */}
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
                {/* Brand — rackets only. Same ordered brand list and
                    same activeBrand state as the BrandTabs pill row
                    above the grid, so picking a brand here or there
                    stays in sync either way. */}
                {category === 'rackets' && availableBrands.length > 0 && (
                  <div className="filter-group">
                    <div className="filter-group-head">Brand</div>
                    <label className={`filter-option ${!activeBrand ? 'filter-option-active' : ''}`}>
                      <input
                        type="radio"
                        name="filter-rackets-Brand"
                        checked={!activeBrand}
                        onChange={() => setActiveBrand(null)}
                        className="filter-check filter-radio"
                      />
                      <span>All</span>
                    </label>
                    {availableBrands.map(b => (
                      <label key={b} className={`filter-option ${activeBrand === b ? 'filter-option-active' : ''}`}>
                        <input
                          type="radio"
                          name="filter-rackets-Brand"
                          checked={activeBrand === b}
                          onChange={() => setActiveBrand(b)}
                          className="filter-check filter-radio"
                        />
                        <span>{b}</span>
                      </label>
                    ))}
                  </div>
                )}

                {Object.entries(meta.filters).map(([group, values]) => {
                  const singleSelect = isSingleSelectGroup(category, group);
                  const groupActive = (activeFilters[group] || []).length > 0;
                  return (
                    <div key={group} className="filter-group">
                      <div className="filter-group-head">{group}</div>
                      {singleSelect && (
                        <label className={`filter-option ${!groupActive ? 'filter-option-active' : ''}`}>
                          <input
                            type="radio"
                            name={`filter-${category}-${group}`}
                            checked={!groupActive}
                            onChange={() => clearGroupFilter(group)}
                            className="filter-check filter-radio"
                          />
                          <span>All</span>
                        </label>
                      )}
                      {values.map(v => {
                        const active = (activeFilters[group] || []).includes(v);
                        return (
                          <label key={v} className={`filter-option ${active ? 'filter-option-active' : ''}`}>
                            <input
                              type={singleSelect ? 'radio' : 'checkbox'}
                              name={singleSelect ? `filter-${category}-${group}` : undefined}
                              checked={active}
                              onChange={() => toggleFilter(group, v)}
                              className={`filter-check ${singleSelect ? 'filter-radio' : ''}`}
                            />
                            <span>{v}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}

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
              <div className="col-empty">
                <p className="t-body">Loading products…</p>
              </div>
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
        .col-grid { flex:1; display:grid; gap:24px; }
        .col-grid-narrow { grid-template-columns:repeat(3,1fr); }
        .col-grid-wide   { grid-template-columns:repeat(4,1fr); }
        .col-empty { grid-column:1/-1; text-align:center; padding:64px 0; }
        .filter-group { margin-bottom:24px; }
        .filter-group-head { font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--gr-2); margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--gr-5); }
        .filter-option { display:flex; align-items:center; gap:10px; padding:5px 0; font-size:13px; cursor:pointer; color:var(--gr-1); }
        .filter-option:hover, .filter-option-active { color:var(--bk); }
        .filter-option-active { font-weight:500; }
        .filter-check { width:14px; height:14px; accent-color:var(--cr); cursor:pointer; flex-shrink:0; }
        .filter-radio { border-radius:50%; }
        .filter-price-row { display:flex; justify-content:space-between; margin-bottom:8px; }
        .filter-range { width:100%; accent-color:var(--cr); cursor:pointer; }
        @media(max-width:1100px){ .col-grid-narrow{grid-template-columns:repeat(2,1fr);} .col-grid-wide{grid-template-columns:repeat(3,1fr);} }
        @media(max-width:860px){
          .col-grid-narrow,.col-grid-wide{grid-template-columns:repeat(2,1fr);}

          /* Filters become a fixed, scrollable drawer sliding in from the
             left with a tap-to-close backdrop, instead of being hidden
             entirely — the previous behaviour left mobile visitors with
             no way to filter at all. */
          .col-sidebar {
            display:block;
            position:fixed; top:0; left:0; bottom:0;
            width:82vw; max-width:340px;
            background:var(--wh);
            z-index:200;
            padding:20px;
            padding-top:calc(20px + env(safe-area-inset-top));
            padding-bottom:calc(24px + env(safe-area-inset-bottom));
            overflow-y:auto;
            -webkit-overflow-scrolling:touch;
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
            position:sticky; top:0; background:var(--wh);
          }
          .col-sidebar-close {
            display:flex; align-items:center; justify-content:center;
            width:32px; height:32px; border-radius:50%; color:var(--gr-1);
          }
          .col-sidebar-close:hover { background:var(--gr-6); }
        }
        @media(max-width:540px){ .col-grid-narrow,.col-grid-wide{grid-template-columns:1fr 1fr; gap:12px;} }
      `}</style>
    </div>
  );
}
