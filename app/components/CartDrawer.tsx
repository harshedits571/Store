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
          transition={{ duration: 0.3 }}
          className={styles.backdrop}
          style={{ pointerEvents: 'auto' }}
          onClick={() => setCartOpen(false)}
        />
      )}

      {isCartOpen && (
        <motion.div
          key="cart-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={styles.drawer}
        >
          <div className={styles.drawerHeader}>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Your Cart</h3>
            <button onClick={() => setCartOpen(false)} className={styles.closeBtn}>✕</button>
          </div>

          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.3 }}>🛒</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Your cart is empty.</p>
              <button onClick={() => setCartOpen(false)} className="btn-primary" style={{ marginTop: '24px', padding: '10px 24px', fontSize: '14px' }}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              <div className={styles.drawerItems}>
                {cart.map(item => {
                  const p = products.find(prod => prod.id === item.id);
                  const isOutOfStock = p?.stockStatus === 'out_of_stock' && item.id !== 'bundle';
                  
                  return (
                    <div key={item.id} className={styles.cartItem} style={{ opacity: isOutOfStock ? 0.6 : 1 }}>
                      <div style={{ flex: 1 }}>
                        <div className={styles.itemName}>
                          {item.name}
                          {isOutOfStock && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Out of Stock</span>}
                        </div>
                        <div className={styles.itemCategory}>{item.category}</div>
                      </div>
                      <div className={styles.itemPrice}>{formatPrice(applyCustomPrice(item.id, getPrice(item), currency))}</div>
                      <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>✕</button>
                    </div>
                  );
                })}
              </div>

              <div className={styles.drawerFooter}>
                <div className={styles.totalRow}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>{formatPrice(dynamicTotal)}</span>
                </div>
                {hasOutOfStock ? (
                  <button
                    disabled
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '50px', textAlign: 'center', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    Remove out of stock items
                  </button>
                ) : (
                  <Link
                    href="/checkout"
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '50px', textAlign: 'center' }}
                    onClick={() => setCartOpen(false)}
                  >
                    Proceed to Checkout
                  </Link>
                )}
                <button
                  onClick={clearCart}
                  style={{ width: '100%', padding: '12px', background: 'none', border: '2px solid var(--border-subtle)', borderRadius: '50px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, marginTop: '8px', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase' }}
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
