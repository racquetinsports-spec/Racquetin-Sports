import { useState, useEffect } from 'react';
import { formatPrice } from '../utils/format';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchProductById, fetchRelated } from '../lib/api/products';
import { normalizeProduct, normalizeProducts } from '../utils/normalizeProduct';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import ProductCard from '../components/product/ProductCard';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();

  const [product, setProduct]   = useState(null);
  const [related, setRelated]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedGrip, setSelectedGrip] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('specs');
  const [added, setAdded] = useState(false);
  const [brokenIdx, setBrokenIdx] = useState(() => new Set());
  const markImageBroken = (i) => setBrokenIdx(prev => new Set(prev).add(i));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setProduct(null);
    setRelated([]);
    setSelectedColor(0);
    setSelectedGrip(0);
    setQty(1);
    setActiveImage(0);
    setActiveTab('specs');
    setBrokenIdx(new Set());

    fetchProductById(id)
      .then(async ({ data, error, redirectTo }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoadError(error?.message || 'Product not found');
          setLoading(false);
          return;
        }
        // The slug in the URL has since changed (an admin renamed this
        // product) — send the visitor to its current URL instead of
        // rendering under the stale one, so bookmarks/shared links/old
        // search-engine results keep working.
        if (redirectTo && redirectTo !== id) {
          navigate(`/product/${redirectTo}`, { replace: true });
          return;
        }
        const normalized = normalizeProduct(data);
        setProduct(normalized);
        const { data: relatedData } = await fetchRelated(normalized.dbId ?? normalized.id, normalized.category);
        if (!cancelled) setRelated(normalizeProducts(relatedData).filter(p => p.id !== normalized.id).slice(0, 4));
        if (!cancelled) setLoading(false);
      })
      .catch(err => {
        if (!cancelled) { setLoadError(err.message || 'Product not found'); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p className="t-body">Loading product…</p>
    </div>
  );

  if (loadError || !product) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <h2 className="t-h2">Product not found</h2>
      <Link to="/rackets" className="btn btn-primary" style={{ marginTop: 24 }}>Browse Rackets</Link>
    </div>
  );

  const wished = has(product.id);

  const handleAddToCart = () => {
    addItem(product, {
      color: product.colors?.[selectedColor],
      grip: product.gripSizes?.[selectedGrip],
      size: product.sizes?.[selectedGrip],
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="pdp">
      {/* Breadcrumb */}
      <div className="container pdp-crumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/${product.category}`} style={{ textTransform: 'capitalize' }}>{product.category}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      {/* Main layout */}
      <div className="container pdp-main">
        {/* Gallery */}
        <div className="pdp-gallery">
          {/* Thumbnails — show real images if available, otherwise grey slots */}
          <div className="pdp-gallery-thumbs">
            {(product.images && product.images.length > 0) ? (
              product.images.map((img, i) => (
                <button
                  key={i}
                  className={`pdp-thumb ${activeImage === i ? 'pdp-thumb-active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {brokenIdx.has(i) ? (
                    <div className="pdp-thumb pdp-thumb-placeholder" style={{ width: '100%', height: '100%', border: 'none' }} />
                  ) : (
                    <img
                      src={img}
                      alt={`${product.name} view ${i + 1}`}
                      className="pdp-thumb-img"
                      loading="lazy"
                      decoding="async"
                      onError={() => markImageBroken(i)}
                    />
                  )}
                </button>
              ))
            ) : (
              [0, 1, 2].map(i => (
                <div key={i} className="pdp-thumb pdp-thumb-placeholder" />
              ))
            )}
          </div>

          {/* Main image */}
          <div className="pdp-main-img">
            {(product.images && product.images.length > 0 && !brokenIdx.has(activeImage)) ? (
              <img
                src={product.images[activeImage] || product.images[0]}
                alt={product.name}
                className="pdp-hero-img"
                fetchpriority="high"
                decoding="async"
                onError={() => markImageBroken(activeImage)}
              />
            ) : (
              <div className="pdp-main-img-placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--gr-3)" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <div className="t-small" style={{ marginTop: 10, color: 'var(--gr-3)' }}>Image coming soon</div>
              </div>
            )}
            {product.badge && (
              <span className={`badge ${product.badge === 'Limited Edition' ? 'badge-black' : 'badge-grey'} pdp-badge`}>
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pdp-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {product.brand && <span className="t-label pdp-brand-pill">{product.brand}</span>}
            <span className="t-label" style={{ color: 'var(--gr-2)' }}>{product.series}</span>
          </div>
          <h1 className="t-h1" style={{ fontSize: 'clamp(24px,3.5vw,40px)' }}>{product.name}</h1>

          <div className="pdp-rating">
            <span className="pdp-rating-score">{product.rating.toFixed(1)}</span>
            <div className="pdp-rating-bar"><div className="pdp-rating-fill" style={{ width: `${(product.rating/5)*100}%` }} /></div>
            <span className="t-small">{product.reviews} reviews</span>
          </div>

          <div className="pdp-price">
            <span className="t-price" style={{ fontSize: 28 }}>{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="t-small" style={{ textDecoration: 'line-through', marginLeft: 10, fontSize: 16 }}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          <p className="t-body" style={{ marginTop: 16, marginBottom: 28 }}>{product.description}</p>
          <div className="divider" style={{ marginBottom: 24 }} />

          {/* Color */}
          {product.colors && (
            <div className="pdp-option-group">
              <div className="pdp-option-label">
                Colour: <strong>{product.colors[selectedColor]}</strong>
              </div>
              <div className="pdp-color-row">
                {product.colors.map((c, i) => (
                  <button
                    key={c}
                    className={`pdp-color-btn ${selectedColor === i ? 'pdp-color-active' : ''}`}
                    onClick={() => setSelectedColor(i)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grip size */}
          {product.gripSizes && (
            <div className="pdp-option-group">
              <div className="pdp-option-label">
                Grip Size: <strong>{product.gripSizes[selectedGrip]}</strong>
              </div>
              <div className="pdp-size-row">
                {product.gripSizes.map((g, i) => (
                  <button
                    key={g}
                    className={`pdp-size-btn ${selectedGrip === i ? 'pdp-size-active' : ''}`}
                    onClick={() => setSelectedGrip(i)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size — shoes (numeric) and apparel (S/M/L) */}
          {product.sizes && (
            <div className="pdp-option-group">
              <div className="pdp-option-label">
                Size: <strong>{product.sizes[selectedGrip] ?? product.sizes[0]}</strong>
              </div>
              <div className="pdp-size-row">
                {product.sizes.map((s, i) => (
                  <button
                    key={s}
                    className={`pdp-size-btn ${selectedGrip === i ? 'pdp-size-active' : ''}`}
                    onClick={() => setSelectedGrip(i)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="pdp-option-group">
            <div className="pdp-option-label">Quantity</div>
            <div className="pdp-qty">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
            </div>
            <span className="t-small" style={{ marginLeft: 12 }}>{product.stock} in stock</span>
          </div>

          {/* CTAs */}
          <div className="pdp-ctas">
            <motion.button
              className={`btn btn-full ${added ? 'btn-red' : 'btn-primary'} btn-lg pdp-atc`}
              onClick={handleAddToCart}
              whileTap={{ scale: 0.98 }}
            >
              {added ? 'Added to Cart' : 'Add to Cart'}
            </motion.button>
            <button
              className={`btn-icon pdp-wish ${wished ? 'pdp-wish-active' : ''}`}
              onClick={() => toggle(product.id)}
              aria-label="Wishlist"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          {/* Trust badges */}
          <div className="pdp-trust">
            {[
              { text: 'Free shipping over ₹5,000' },
              { text: '30-day free returns' },
              { text: 'Secure checkout' },
            ].map(b => (
              <div key={b.text} className="pdp-trust-item">
                <span className="pdp-trust-dot" />
                <span className="t-small">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container pdp-tabs-section">
        <div className="pdp-tabs">
          {(product.inBox ? ['specs', 'characteristics', 'technology', 'in-box', 'reviews'] : ['specs', 'technology', 'reviews']).map(tab => (
            <button
              key={tab}
              className={`pdp-tab ${activeTab === tab ? 'pdp-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'in-box' ? 'In the Box' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'specs' && (
          <div className="pdp-specs">
            <table className="specs-table">
              <tbody>
                {Object.entries(product.specs).map(([k, v]) => (
                  <tr key={k}>
                    <td className="specs-key">{k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, s => s.toUpperCase())}</td>
                    <td className="specs-val">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'technology' && (
          <div className="pdp-tech">
            {product.technologies?.length > 0 ? (
              product.technologies.map(t => (
                <div key={t} className="pdp-tech-item">
                  <div className="pdp-tech-dot" />
                  <div>
                    <div className="t-h4">{t}</div>
                    <p className="t-body">Advanced engineering designed to optimise your performance on court.</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="t-body">Technology details coming soon.</p>
            )}
          </div>
        )}

                {activeTab === 'characteristics' && (
          <div className="pdp-characteristics">
            <div className="pdp-char-grid">
              {[
                product.playerLevel && { label: 'Player Level', value: product.playerLevel },
                product.playingStyle && { label: 'Playing Style', value: product.playingStyle },
                product.balance     && { label: 'Balance', value: product.balance },
                product.flex        && { label: 'Shaft Flex', value: product.flex },
                product.weight      && { label: 'Weight', value: product.weight },
                product.maxTension  && { label: 'Max Tension', value: product.maxTension },
                product.recommendedString && { label: 'Recommended String', value: product.recommendedString },
                product.frameMaterial && { label: 'Frame Material', value: product.frameMaterial },
                product.shaftMaterial && { label: 'Shaft Material', value: product.shaftMaterial },
                product.brand       && { label: 'Brand', value: product.brand },
                product.series      && { label: 'Series', value: product.series },
                product.warranty    && { label: 'Warranty', value: product.warranty },
              ].filter(Boolean).map(row => (
                <div key={row.label} className="pdp-char-row">
                  <span className="pdp-char-label">{row.label}</span>
                  <span className="pdp-char-value">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'in-box' && product.inBox && (
          <div className="pdp-inbox">
            {product.inBox.map(item => (
              <div key={item} className="pdp-inbox-item">
                <span className="pdp-inbox-dot" />
                <span className="t-body">{item}</span>
              </div>
            ))}
            {product.warranty && (
              <p className="t-small" style={{ marginTop: 24, color: 'var(--gr-2)' }}>
                Warranty: {product.warranty}
              </p>
            )}
          </div>
        )}

{activeTab === 'reviews' && (
          <div className="pdp-reviews">
            <div className="pdp-review-summary">
              <div className="pdp-review-score">{product.rating}</div>
              <div>
                <div className="pdp-rating-bar" style={{ width: 80, height: 3 }}><div className="pdp-rating-fill" style={{ width: `${(product.rating/5)*100}%` }} /></div>
                <div className="t-small" style={{ marginTop: 4 }}>Based on {product.reviews} reviews</div>
              </div>
            </div>
            {[
              { name: 'James T.', rating: 5, text: 'Absolutely incredible racket. The frame stiffness is perfect for my smash game.', date: '2 days ago' },
              { name: 'Sarah K.', rating: 5, text: 'Upgraded from my old racket and instantly noticed the difference in speed.', date: '1 week ago' },
              { name: 'Michael R.', rating: 4, text: 'Excellent build quality. Slightly heavier than expected but great control.', date: '2 weeks ago' },
            ].map(r => (
              <div key={r.name} className="review-item">
                <div className="review-header">
                  <div className="review-avatar">{r.name[0]}</div>
                  <div>
                    <div className="t-h4" style={{ fontSize: 13 }}>{r.name}</div>
                    <div className="pdp-review-rating">{r.rating}.0 / 5</div>
                  </div>
                  <span className="t-small" style={{ marginLeft: 'auto' }}>{r.date}</span>
                </div>
                <p className="t-body" style={{ marginTop: 8 }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="container pdp-related">
          <div className="section-header">
            <div className="section-header-left">
              <div className="eyebrow">You May Also Like</div>
              <h3 className="t-h3">Related Products</h3>
            </div>
          </div>
          <div className="grid-4">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      )}

      <style>{`
        .pdp { padding-bottom: 80px; }
        .pdp-crumb { display:flex; align-items:center; gap:8px; padding:20px 48px; font-size:12px; color:var(--gr-2); }
        .pdp-crumb a:hover { color:var(--bk); }
        .pdp-main { display:grid; grid-template-columns:1fr 1fr; gap:56px; padding:0 48px 0; align-items:start; }
        .pdp-gallery { display:flex; gap:12px; position:sticky; top:80px; }
        .pdp-gallery-thumbs { display:flex; flex-direction:column; gap:8px; }

        /* Thumbnail button */
        .pdp-thumb {
          width:64px; height:64px;
          background:#fff;
          border-radius:var(--r-sm);
          border:1.5px solid var(--gr-4);
          cursor:pointer;
          overflow:hidden;
          padding:0;
          display:flex; align-items:center; justify-content:center;
          transition:border-color .2s;
        }
        .pdp-thumb:hover { border-color:var(--bk); }
        .pdp-thumb-active { border-color:var(--cr) !important; }
        .pdp-thumb-placeholder { background:var(--gr-6); cursor:default; }
        .pdp-thumb-img {
          width:100%; height:100%;
          object-fit:contain;
          object-position:center;
          padding:8%;
        }

        /* Main hero image */
        .pdp-main-img {
          flex:1;
          aspect-ratio:1;
          background:#fff;
          border:1px solid var(--gr-5);
          border-radius:var(--r);
          position:relative;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        .pdp-hero-img {
          width:100%; height:100%;
          object-fit:contain;
          object-position:center;
          padding:6%;
          display:block;
        }
        .pdp-main-img-placeholder { display:flex; flex-direction:column; align-items:center; color:var(--gr-3); }
        .pdp-badge { position:absolute; top:16px; left:16px; }
        .pdp-rating { display:flex; align-items:center; gap:10px; margin-top:12px; }
        .pdp-rating-score { font-size:15px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--bk); }
        .pdp-rating-bar { width:60px; height:2px; background:var(--gr-4); border-radius:1px; overflow:hidden; flex-shrink:0; }
        .pdp-rating-fill { height:100%; background:var(--bk); border-radius:1px; }
        .pdp-review-rating { font-size:11px; font-weight:600; color:var(--gr-2); font-variant-numeric:tabular-nums; }
        .pdp-brand-pill { background:var(--cr); color:#fff; padding:2px 8px; border-radius:2px; } .pdp-price { margin-top:14px; display:flex; align-items:baseline; gap:0; }
        .pdp-option-group { margin-bottom:20px; }
        .pdp-option-label { font-size:12px; font-weight:500; margin-bottom:10px; }
        .pdp-color-row, .pdp-size-row { display:flex; flex-wrap:wrap; gap:8px; }
        .pdp-color-btn { padding:6px 14px; border:1.5px solid var(--gr-4); border-radius:100px; font-size:12px; transition:var(--trans); }
        .pdp-color-btn:hover, .pdp-color-active { border-color:var(--bk); background:var(--bk); color:var(--wh); }
        .pdp-size-btn { width:48px; height:40px; border:1.5px solid var(--gr-4); border-radius:var(--r-sm); font-size:13px; font-weight:500; transition:var(--trans); }
        .pdp-size-btn:hover, .pdp-size-active { border-color:var(--bk); background:var(--bk); color:var(--wh); }
        .pdp-qty { display:inline-flex; align-items:center; border:1.5px solid var(--gr-4); border-radius:var(--r-sm); overflow:hidden; }
        .pdp-qty button { width:36px; height:36px; font-size:18px; transition:background .15s; }
        .pdp-qty button:hover { background:var(--gr-6); }
        .pdp-qty span { width:44px; text-align:center; font-size:14px; font-weight:600; border-left:1.5px solid var(--gr-4); border-right:1.5px solid var(--gr-4); height:36px; display:flex; align-items:center; justify-content:center; }
        .pdp-ctas { display:flex; gap:12px; margin-top:24px; }
        .pdp-atc { flex:1; }
        .pdp-wish { border-color:var(--gr-4); }
        .pdp-wish-active { color:var(--cr); border-color:var(--cr); }
        .pdp-trust { display:flex; gap:20px; margin-top:20px; flex-wrap:wrap; }
        .pdp-trust-item { display:flex; align-items:center; gap:7px; }
        .pdp-tabs-section { margin-top:64px; }
        .pdp-tabs { display:flex; gap:0; border-bottom:1.5px solid var(--gr-5); margin-bottom:32px; }
        .pdp-tab { padding:12px 24px; font-size:13px; font-weight:500; color:var(--gr-2); border-bottom:2px solid transparent; margin-bottom:-1.5px; transition:var(--trans); }
        .pdp-tab-active { color:var(--bk); border-bottom-color:var(--bk); }
        .pdp-tab:hover { color:var(--bk); }
        .specs-table { width:100%; max-width:560px; border-collapse:collapse; }
        .specs-key { padding:12px 0; font-size:12px; font-weight:500; letter-spacing:.04em; text-transform:capitalize; color:var(--gr-2); border-bottom:1px solid var(--gr-5); width:180px; vertical-align:top; }
        .specs-val { padding:12px 0; font-size:13px; font-weight:500; border-bottom:1px solid var(--gr-5); }
        .pdp-characteristics { max-width: 640px; }
        .pdp-char-grid { display:flex; flex-direction:column; }
        .pdp-char-row { display:flex; justify-content:space-between; align-items:baseline; padding:13px 0; border-bottom:1px solid var(--gr-5); gap:24px; }
        .pdp-char-label { font-size:12px; font-weight:500; color:var(--gr-2); text-transform:capitalize; flex-shrink:0; }
        .pdp-char-value { font-size:13px; font-weight:500; text-align:right; }
        .pdp-inbox { max-width:400px; display:flex; flex-direction:column; gap:12px; }
        .pdp-inbox-item { display:flex; align-items:center; gap:12px; }
        .pdp-inbox-dot { width:5px; height:5px; border-radius:50%; background:var(--cr); flex-shrink:0; }
        .pdp-tech { display:flex; flex-direction:column; gap:20px; max-width:560px; }
        .pdp-tech-item { display:flex; gap:16px; padding:20px; border:1px solid var(--gr-5); border-radius:var(--r); }
        .pdp-tech-dot { width:8px; height:8px; border-radius:50%; background:var(--cr); flex-shrink:0; margin-top:6px; }
        .pdp-reviews { max-width:640px; }
        .pdp-review-summary { display:flex; align-items:center; gap:20px; padding:24px; background:var(--gr-6); border-radius:var(--r); margin-bottom:24px; }
        .pdp-review-score { font-size:48px; font-weight:700; letter-spacing:-.04em; }
        .review-item { padding:20px 0; border-bottom:1px solid var(--gr-5); }
        .review-header { display:flex; align-items:center; gap:12px; }
        .review-avatar { width:32px; height:32px; border-radius:50%; background:var(--bk); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; }
        .pdp-related { margin-top:64px; }
        @media(max-width:900px){
          .pdp-main{grid-template-columns:1fr; padding:0 20px;}
          .pdp-gallery{position:static; flex-direction:column-reverse;}
          .pdp-crumb{padding:16px 20px;}
          /* Main image first (DOM has thumbs before it — column-reverse
             flips the visual order), thumbnails become a horizontal
             swipeable strip beneath it instead of a cramped side column
             eating into a narrow screen's width. */
          .pdp-gallery-thumbs{ flex-direction:row; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:4px; }
          .pdp-gallery-thumbs .pdp-thumb{ flex-shrink:0; }
        }
      `}</style>
    </div>
  );
}
