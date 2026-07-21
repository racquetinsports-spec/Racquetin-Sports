import { useState, useEffect, useRef } from 'react';
import { formatPrice } from '../../utils/format';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store';
import { fetchProducts, fetchBrandsByCategory } from '../../lib/api/products';
import { normalizeProducts } from '../../utils/normalizeProduct';
import { sortBrands, compareBrands } from '../../utils/brandOrder';
import { trackSearch } from '../../lib/analytics';

const ALL_CATEGORY_SLUGS = ['rackets', 'shoes', 'bags', 'shuttlecocks', 'strings', 'grips', 'apparel'];

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // "Popular searches" pills — previously a hardcoded array that included
  // terms with no matching products (e.g. old test-series names), so
  // tapping one reliably returned "No results". These are now the real
  // brands currently in the catalogue, so every pill is guaranteed to
  // return matches when tapped.
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) { setTimeout(() => inputRef.current?.focus(), 100); setQuery(''); }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen || suggestions.length) return;
    fetchBrandsByCategory(ALL_CATEGORY_SLUGS)
      .then(({ data }) => {
        // sortBrands puts Yonex/Li-Ning/Hundred first (per the shared
        // priority) and leaves every other brand — including non-racket
        // ones mixed in from other categories — alphabetical after them.
        const brands = sortBrands(Object.values(data || {}).flat());
        setSuggestions(brands.slice(0, 6));
      })
      .catch(() => setSuggestions([]));
  }, [searchOpen, suggestions.length]);

  useEffect(() => {
    if (query.length <= 1) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      fetchProducts({ search: query, limit: 8 })
        .then(({ data }) => {
          if (cancelled) return;
          const normalized = normalizeProducts(data);
          // Only reorders pairs where BOTH items are rackets (stable
          // sort leaves every other pair, including racket-vs-non-racket,
          // exactly where it was) — so Yonex/Li-Ning/Hundred rackets
          // surface first among themselves without disturbing overall
          // search relevance for other categories.
          normalized.sort((a, b) =>
            a.category === 'rackets' && b.category === 'rackets' ? compareBrands(a.brand, b.brand) : 0
          );
          setResults(normalized);
          trackSearch(query, { resultsCount: normalized.length });
        })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250); // debounce so every keystroke doesn't fire a query
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') closeSearch(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: .2 }}
        >
          <motion.div
            className="search-box"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: .25, ease: [.16,1,.3,1] }}
          >
            <div className="search-input-row">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gr-2)" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                className="search-input"
                placeholder="Search rackets, shoes, bags..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button className="search-close" onClick={closeSearch}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {query.length === 0 ? (
              suggestions.length > 0 && (
                <div className="search-suggestions">
                  <div className="t-label" style={{ color: 'var(--gr-2)', marginBottom: 12 }}>Popular searches</div>
                  <div className="search-pills">
                    {suggestions.map(s => (
                      <button key={s} className="search-pill" onClick={() => setQuery(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )
            ) : searching ? (
              <div className="search-empty">
                <p className="t-body">Searching…</p>
              </div>
            ) : results.length === 0 ? (
              <div className="search-empty">
                <p className="t-body">No results for "<strong>{query}</strong>"</p>
                <p className="t-small" style={{ marginTop: 6 }}>Try a different search term</p>
              </div>
            ) : (
              <div className="search-results">
                {results.map(p => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="search-result-item"
                    onClick={closeSearch}
                  >
                    <div className="search-result-img">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:'6%' }} />}
                    </div>
                    <div>
                      <div className="search-result-name">{p.name}</div>
                      <div className="t-small">{p.category} · {formatPrice(p.price)}</div>
                    </div>
                    <div className="search-result-price t-price" style={{ fontSize: 13, marginLeft: 'auto' }}>
                      {formatPrice(p.price)}
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/search?q=${query}`}
                  className="search-all"
                  onClick={closeSearch}
                >
                  View all results for "{query}" →
                </Link>
              </div>
            )}
          </motion.div>
          <div className="search-backdrop" onClick={closeSearch} />

          <style>{`
            .search-overlay { position:fixed; inset:0; z-index:800; }
            .search-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.3); }
            .search-box { position:relative; z-index:1; max-width:640px; margin:80px auto 0; background:var(--wh); border-radius:var(--r); box-shadow:var(--shadow-md); overflow:hidden; }
            .search-input-row { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--gr-5); }
            .search-input { flex:1; font-size:16px; border:none; outline:none; background:transparent; }
            .search-close { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; color:var(--gr-2); transition:background .2s; }
            .search-close:hover { background:var(--gr-6); color:var(--bk); }
            .search-suggestions, .search-empty { padding:20px; }
            .search-pills { display:flex; flex-wrap:wrap; gap:8px; }
            .search-pill { padding:6px 14px; border:1.5px solid var(--gr-4); border-radius:100px; font-size:12px; transition:var(--trans); }
            .search-pill:hover { border-color:var(--bk); background:var(--bk); color:var(--wh); }
            .search-results { max-height:400px; overflow-y:auto; }
            .search-result-item { display:flex; align-items:center; gap:14px; padding:12px 20px; transition:background .15s; }
            .search-result-item:hover { background:var(--gr-6); }
            .search-result-img { width:44px; height:44px; background:#fff; border:1px solid var(--gr-5); border-radius:var(--r-sm); flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
            .search-result-name { font-size:13px; font-weight:600; }
            .search-all { display:block; padding:14px 20px; font-size:12px; font-weight:500; color:var(--cr); border-top:1px solid var(--gr-5); }
            .search-all:hover { background:var(--gr-6); }
            @media(max-width:680px){ .search-box { margin:60px 16px 0; } }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
