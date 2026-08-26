'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { useStore } from '../context/StoreContext';
import { useCurrency } from '../context/CurrencyContext';
import Skeleton from '../components/Skeleton';

export default function ProductsPage() {
  const { products, initialLoading: loading } = useStore();
  const { formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const [filter, setFilter] = useState('All');

  const filteredProducts = filter === 'All' ? products : products.filter(p => p.category === filter);

  return (
    <div className="container section">
      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="h1">All Products</h1>
        <p className="text-secondary" style={{ marginTop: '8px' }}>
          Discover our premium collection of tools to enhance your creative process.
        </p>
      </motion.div>

      <motion.div 
        className={styles.filters}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {['All', 'Plugin', 'Script', 'Assets', 'Audio'].map(cat => (
          <button 
            key={cat}
            className={`btn-secondary ${filter === cat ? styles.activeFilter : ''}`}
            onClick={() => setFilter(cat)}
            style={{ transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Skeleton height="200px" borderRadius="12px" />
              <div>
                <Skeleton height="28px" width="70%" style={{ marginBottom: '8px' }} />
                <Skeleton height="16px" width="100%" style={{ marginBottom: '4px' }} />
                <Skeleton height="16px" width="80%" />
              </div>
              <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <Skeleton height="28px" width="80px" />
                <Skeleton height="36px" width="110px" borderRadius="100px" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}
        >
          No products found in this category.
        </motion.div>
      ) : (
        <motion.div 
          className="grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.06
              }
            }
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
              >
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -6, boxShadow: '0 16px 36px rgba(0,0,0,0.12)' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-panel" 
                  style={{ 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px', 
                    height: '100%',
                    cursor: 'pointer',
                    opacity: product.stockStatus === 'out_of_stock' ? 0.6 : 1,
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    willChange: 'transform'
                  }}
                >
                  <div 
                    className={styles.productImagePlaceholder}
                    style={
                      ((product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0]) || product.imageUrl) 
                      ? { 
                          backgroundImage: `url(${(product.imageUrls && product.imageUrls[0]) || product.imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: 'none'
                        } 
                      : {}
                    }
                  >
                     <span className={styles.categoryBadge}>{product.category}</span>
                     {product.stockStatus === 'out_of_stock' && (
                       <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                         Out of Stock
                       </div>
                     )}
                  </div>
                  <div>
                    <h3 className="h3">{product.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                  </div>
                  <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const effectivePrice = product.hasVersions && product.versions?.length > 0
                          ? Math.min(...product.versions.map((v: any) => getPrice(v)))
                          : getPrice(product);
                        const origPrice = product.hasVersions && product.versions?.length > 0
                          ? getOriginalPrice(product.versions[0])
                          : getOriginalPrice(product);
                        const displayPrice = product.hasVersions && product.versions?.length > 0
                          ? (effectivePrice === 0 ? 'Free' : `From ${formatPrice(effectivePrice)}`)
                          : formatPrice(effectivePrice);

                        return (
                          <>
                            {effectivePrice < origPrice && origPrice > 0 && (
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal' }}>
                                {formatPrice(origPrice)}
                              </span>
                            )}
                            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{displayPrice}</span>
                          </>
                        );
                      })()}
                    </span>
                    <span className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>View Details</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

