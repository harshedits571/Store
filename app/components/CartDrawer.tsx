'use client';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import styles from './CartDrawer.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useCustomLink } from '../context/CustomLinkContext';
import { useStore } from '../context/StoreContext';

export default function CartDrawer() {
  const { cart, removeFromCart, clearCart, isCartOpen, setCartOpen } = useCart();
  const { currency, getPrice, formatPrice } = useCurrency();
  const { applyCustomPrice } = useCustomLink();
  const { products, initialLoading } = useStore();

  const dynamicTotal = cart.reduce((sum, item) => sum + applyCustomPrice(item.id, getPrice(item), currency), 0);

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCartOpen]);

  // Auto-remove deleted products
  useEffect(() => {
    if (initialLoading || cart.length === 0) return;
    cart.forEach(item => {
      if (item.id === 'bundle') return;
      const exists = products.some(p => p.id === item.id);
      if (!exists) {
        removeFromCart(item.id);
      }
    });
  }, [cart, products, initialLoading, removeFromCart]);

  const hasOutOfStock = cart.some(item => {
    if (item.id === 'bundle') return false;
    const p = products.find(prod => prod.id === item.id);
    return p?.stockStatus === 'out_of_stock';
  });

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          key="cart-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={styles.backdrop}
          style={{ pointerEvents: 'auto' }}
          onClick={() => setCartOpen(false)}
        />
      )}

      {isCartOpen && (
        <motion.div
          key="cart-drawer"
          initial={{ x: '100%', opacity: 0.9 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.9 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className={styles.drawer}
        >
          {/* Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.headerTitleWrapper}>
              <h3 className={styles.drawerTitle}>Your Cart</h3>
              {cart.length > 0 && (
                <span className={styles.cartCountBadge}>
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <button
              onClick={() => setCartOpen(false)}
              className={styles.closeBtn}
              aria-label="Close cart"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconBox}>
                🛒
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Your cart is empty
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 24px 0', maxWidth: '240px', lineHeight: 1.5 }}>
                Explore our catalog to find motion packs, scripts, and editing presets.
              </p>
              <button
                onClick={() => setCartOpen(false)}
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '14px', borderRadius: '12px' }}
              >
                Browse Assets ✦
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className={styles.drawerItems}>
                {cart.map(item => {
                  const p = products.find(prod => prod.id === item.id);
                  const isOutOfStock = p?.stockStatus === 'out_of_stock' && item.id !== 'bundle';
                  const thumb = p?.imageUrls?.[0] || p?.imageUrl || null;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={item.id}
                      className={styles.cartItem}
                      style={{ opacity: isOutOfStock ? 0.6 : 1 }}
                    >
                      {/* Product Thumbnail */}
                      <div className={styles.itemThumb}>
                        {thumb ? (
                          <img src={thumb} alt={item.name} />
                        ) : (
                          item.category === 'Bundle' ? '🎁' : item.category === 'Plugin' ? '⚡' : '📦'
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.itemName}>
                          {item.name}
                          {isOutOfStock && (
                            <span style={{ marginLeft: '8px', fontSize: '0.68rem', background: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className={styles.itemCategory}>{item.category || 'Asset'}</div>
                      </div>

                      {/* Price */}
                      <div className={styles.itemPrice}>
                        {formatPrice(applyCustomPrice(item.id, getPrice(item), currency))}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className={styles.removeBtn}
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className={styles.drawerFooter}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Subtotal</span>
                  <span className={styles.totalValue}>{formatPrice(dynamicTotal)}</span>
                </div>

                {hasOutOfStock ? (
                  <button
                    disabled
                    className={styles.checkoutBtn}
                    style={{ opacity: 0.5, cursor: 'not-allowed', background: 'var(--text-muted)' }}
                  >
                    Remove out of stock items
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className={styles.checkoutBtn}
                    onClick={() => setCartOpen(false)}
                  >
                    <span>Proceed to Checkout</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                )}

                <button
                  onClick={clearCart}
                  className={styles.clearBtn}
                >
                  Clear Cart
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
