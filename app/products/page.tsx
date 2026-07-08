'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { useStore } from '../context/StoreContext';
import { useCurrency } from '../context/CurrencyContext';

export default function ProductsPage() {
  const { products, initialLoading: loading } = useStore();
  const { formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const [filter, setFilter] = useState('All');

  const filteredProducts = filter === 'All' ? products : products.filter(p => p.category === filter);

  return (
    <div className="container section">
      <div className={styles.header}>
        <h1 className="h1">All Products</h1>
        <p className="text-secondary" style={{ marginTop: '8px' }}>
          Discover our premium collection of tools to enhance your creative process.
        </p>
      </div>

      <div className={styles.filters}>
        {['All', 'Plugin', 'Script', 'Assets', 'Audio'].map(cat => (
          <button 
            key={cat}
            className={`btn-secondary ${filter === cat ? styles.activeFilter : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No products found in this category.</div>
      ) : (
        <div className="grid-cols-3">
          {filteredProducts.map(product => (
            <div key={product.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              </div>
              <div>
                <h3 className="h3">{product.name}</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
              </div>
              <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getPrice(product) < getOriginalPrice(product) && (
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal' }}>
                      {formatPrice(getOriginalPrice(product))}
                    </span>
                  )}
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatPrice(getPrice(product))}</span>
                </span>
                <Link href={`/products/${product.id}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
