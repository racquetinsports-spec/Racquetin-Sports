import { useEffect } from 'react';
import { formatPrice } from '../../utils/format';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store';
import { useCart } from '../../hooks/useCart';

export default function CartDrawer() {
  const { items, total, removeItem, updateQty } = useCart();
  const isOpen    = useUIStore(s => s.cartOpen);
  const closeCart = useUIStore(s => s.closeCart);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .25 }}
            onClick={closeCart}
          />
          <motion.div
            className="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: .35, ease: [.16,1,.3,1] }}
          >
            <div className="cart-header">
              <span className="t-h4">Cart {items.length > 0 && <span style={{ color: 'var(--gr-2)', fontWeight: 400 }}>({items.length})</span>}</span>
              <button className="cart-close" onClick={closeCart}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="cart-items">
              {items.length === 0 ? (
                <div className="cart-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gr-3)" strokeWidth="1.5">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                  </svg>
                  <p className="t-body" style={{ marginTop: 16 }}>Your cart is empty</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 20 }} onClick={closeCart}>
                    Continue Shopping
                  </button>
                </div>
              ) : items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-img">
                    {item.product.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8%' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : null}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product.name}</div>
                    <div className="cart-item-variant t-small">
                      {item.product.series}
                      {item.variant.color && ` · ${item.variant.color}`}
                      {item.variantInfo && ` · ${item.variantInfo.name}: ${item.variantInfo.value}`}
                    </div>
                    <div className="cart-item-price t-price" style={{ fontSize: 14 }}>{formatPrice(item.product.price)}</div>
                  </div>
                  <div className="cart-item-right">
                    <button className="cart-remove" onClick={() => removeItem(item.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                    <div className="cart-qty">
                      <button onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="cart-footer">
                <div className="cart-subtotal">
                  <span className="t-body">Subtotal</span>
                  <span className="t-price">{formatPrice(total)}</span>
                </div>
                <p className="t-small" style={{ marginBottom: 16 }}>Shipping calculated at checkout</p>
                <Link to="/checkout" className="btn btn-red btn-full" onClick={closeCart}>
                  Checkout
                </Link>
                <button className="btn btn-outline btn-full" style={{ marginTop: 8 }} onClick={closeCart}>
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
      <style>{`
        .cart-overlay { position:fixed; inset:0; z-index:600; background:rgba(0,0,0,.35); }
        .cart-drawer { position:fixed; top:0; right:0; bottom:0; z-index:601; width:min(440px,100vw); background:var(--wh); display:flex; flex-direction:column; }
        .cart-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--gr-5); }
        .cart-close { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; transition:background .2s; }
        .cart-close:hover { background:var(--gr-6); }
        .cart-items { flex:1; overflow-y:auto; padding:8px 24px; }
        .cart-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; }
        .cart-item { display:flex; gap:14px; padding:18px 0; border-bottom:1px solid var(--gr-5); }
        .cart-item-img { width:72px; height:72px; background:#fff; border:1px solid var(--gr-5); border-radius:var(--r-sm); flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .cart-item-info { flex:1; display:flex; flex-direction:column; gap:4px; }
        .cart-item-name { font-size:13px; font-weight:600; }
        .cart-item-right { display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; }
        .cart-remove { color:var(--gr-3); transition:color .2s; }
        .cart-remove:hover { color:var(--cr); }
        .cart-qty { display:flex; align-items:center; gap:0; border:1px solid var(--gr-4); border-radius:var(--r-sm); overflow:hidden; }
        .cart-qty button { width:28px; height:28px; font-size:16px; color:var(--bk); transition:background .15s; }
        .cart-qty button:hover { background:var(--gr-6); }
        .cart-qty span { width:32px; text-align:center; font-size:13px; font-weight:500; border-left:1px solid var(--gr-4); border-right:1px solid var(--gr-4); height:28px; display:flex; align-items:center; justify-content:center; }
        .cart-footer { padding:20px 24px; border-top:1px solid var(--gr-5); }
        .cart-subtotal { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
      `}</style>
    </AnimatePresence>
  );
}
