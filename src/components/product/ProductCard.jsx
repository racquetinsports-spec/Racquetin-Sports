import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import { motion } from 'framer-motion';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

const ProductCard = memo(function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const { toggle, has } = useWishlist();
  const wished               = has(product.id);
  const [imgFailed, setImgFailed] = useState(false);

  // Primary image is images[0]; fall back to placeholder if missing or if it fails to load
  // (e.g. a Supabase Storage file that's been moved/deleted but the DB row still references it).
  const primaryImage = !imgFailed ? (product.images?.[0] ?? null) : null;

  const badgeClass = () => {
    if (!product.badge) return '';
    if (product.badge === 'Sale')             return 'badge badge-navy';
    if (product.badge === 'Limited Edition')  return 'badge badge-black';
    if (product.badge === 'New')              return 'badge badge-black';
    if (product.badge === 'Best Seller')      return 'badge badge-grey';
    return 'badge badge-grey';
  };

  return (
    <motion.div
      className="pcard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .5, delay: index * .06, ease: [.16,1,.3,1] }}
    >
      {/* Image */}
      <Link to={`/product/${product.id}`} className="pcard-img-wrap">
        <div className="pcard-img">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="pcard-photo"
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="pcard-img-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}
          {product.badge && (
            <span className={`pcard-badge ${badgeClass()}`}>
              {product.badge}
            </span>
          )}
        </div>
        <button
          className={`pcard-wish ${wished ? 'pcard-wish-active' : ''}`}
          onClick={e => { e.preventDefault(); toggle(product.id); }}
          aria-label="Add to wishlist"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </Link>

      {/* Info */}
      <div className="pcard-body">
        <div className="pcard-meta">
          {product.brand && (
            <span className="pcard-brand t-label">{product.brand}</span>
          )}
          <span className="t-label pcard-series">{product.series}</span>
        </div>

        <Link to={`/product/${product.id}`} className="pcard-name t-h4">{product.name}</Link>

        {/* Racket-specific key specs */}
        {product.playerLevel && (
          <div className="pcard-specs-row">
            <span className="pcard-spec-pill">{product.playerLevel}</span>
            <span className="pcard-spec-pill">{product.balance}</span>
            <span className="pcard-spec-pill">{product.flex}</span>
          </div>
        )}

        {/* Non-racket spec line */}
        {!product.playerLevel && (product.weight || product.specs?.weight) && (
          <div className="pcard-spec t-small">
            {product.weight || product.specs?.weight}
            {(product.balance || product.specs?.balance) && (
              <> · {product.balance || product.specs.balance}</>
            )}
          </div>
        )}

        <div className="pcard-rating">
          <span className="pcard-rating-score">{product.rating.toFixed(1)}</span>
          <span className="pcard-rating-bar">
            <span className="pcard-rating-fill" style={{ width: `${(product.rating / 5) * 100}%` }} />
          </span>
          <span className="t-small">({product.reviews})</span>
        </div>

        <div className="pcard-footer">
          <div className="pcard-price">
            <span className="t-price">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="t-small pcard-orig">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            className="pcard-atc btn btn-primary btn-sm"
            onClick={() => addItem(product, { color: product.colors?.[0] })}
          >
            Add
          </button>
        </div>
      </div>

      <style>{`
        /* ── Card shell ───────────────────────────────── */
        .pcard { display:flex; flex-direction:column; background:var(--wh); }

        /* ── Image area ───────────────────────────────── */
        .pcard-img-wrap { display:block; position:relative; }
        .pcard-img {
          position:relative;
          aspect-ratio:1;
          background:#fff;
          border:1px solid var(--gr-5);
          border-radius:var(--r);
          overflow:hidden;
          transition:border-color .25s;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .pcard:hover .pcard-img { border-color:var(--gr-4); }

        /* Real product photo — contain so nothing is cropped */
        .pcard-photo {
          width:100%;
          height:100%;
          object-fit:contain;
          object-position:center;
          padding:10%;          /* breathing room inside the square */
          transition:transform .45s cubic-bezier(.16,1,.3,1);
          display:block;
        }
        .pcard:hover .pcard-photo { transform:scale(1.04); }

        .pcard-img-placeholder {
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        /* Badge — top-left */
        .pcard-badge { position:absolute; top:10px; left:10px; z-index:2; }

        /* Wishlist button */
        .pcard-wish {
          position:absolute; top:10px; right:10px; z-index:2;
          width:30px; height:30px; border-radius:50%;
          background:rgba(255,255,255,.9);
          display:flex; align-items:center; justify-content:center;
          color:var(--gr-3);
          transition:var(--trans);
          opacity:0;
        }
        .pcard:hover .pcard-wish { opacity:1; }
        .pcard-wish-active { opacity:1 !important; color:var(--cr) !important; }
        .pcard-wish:hover { background:var(--wh); color:var(--cr); }

        /* ── Body ─────────────────────────────────────── */
        .pcard-body {
          padding:12px 2px 0;
          flex:1;
          display:flex;
          flex-direction:column;
          gap:5px;
        }
        .pcard-meta { display:flex; align-items:center; gap:6px; }
        .pcard-brand { font-size:9px; font-weight:700; letter-spacing:.1em; color:var(--cr); text-transform:uppercase; }
        .pcard-series { font-size:9px; color:var(--gr-3); }

        .pcard-name {
          font-size:clamp(12px,1.1vw,14px);
          font-weight:600;
          letter-spacing:-.01em;
          color:var(--bk);
          transition:color .2s;
          line-height:1.3;
        }
        .pcard-name:hover { color:var(--cr); }

        /* Racket spec pills */
        .pcard-specs-row { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
        .pcard-spec-pill {
          font-size:9px;
          font-weight:500;
          letter-spacing:.04em;
          padding:2px 6px;
          background:var(--gr-6);
          border-radius:100px;
          color:var(--gr-1);
          white-space:nowrap;
        }

        /* Generic spec line */
        .pcard-spec { font-size:11px; color:var(--gr-2); margin-top:1px; }

        /* Rating */
        .pcard-rating { display:flex; align-items:center; gap:6px; }
        .pcard-rating-score { font-size:11px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--bk); }
        .pcard-rating-bar { width:36px; height:2px; background:var(--gr-4); border-radius:1px; overflow:hidden; flex-shrink:0; }
        .pcard-rating-fill { display:block; height:100%; background:var(--bk); border-radius:1px; }

        /* Footer */
        .pcard-footer {
          display:flex; align-items:center; justify-content:space-between;
          margin-top:auto; padding-top:10px;
        }
        .pcard-price { display:flex; align-items:baseline; gap:6px; }
        .pcard-orig { text-decoration:line-through; color:var(--gr-3); }

        .pcard-atc {
          opacity:0;
          transform:translateY(4px);
          transition:var(--trans);
        }
        .pcard:hover .pcard-atc { opacity:1; transform:translateY(0); }
      `}</style>
    </motion.div>
  );
});

export default ProductCard;