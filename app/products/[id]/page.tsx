'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useStore } from '../../context/StoreContext';
import { db } from '@/lib/firebase';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import styles from './page.module.css';

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { products, initialLoading: loading } = useStore();
  const { addToCart } = useCart();
  const { formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Find product from pre-loaded context
  const product = products.find(p => p.id === resolvedParams.id) || null;
  const images = product?.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : (product?.imageUrl ? [product.imageUrl] : []);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      inrPrice: product.inrPrice,
      inrSalePrice: product.inrSalePrice,
      category: product.category,
      requiresLicense: product.requiresLicense ?? true // Fallback to true for old products
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!loading && !product) return <div className="container section" style={{ textAlign: 'center' }}>Product not found.</div>;

  return (
    <div className="container section">
      <Link href="/products" className={styles.backLink}>
        ← Back to Products
      </Link>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading product details...</div>
      ) : (
      <div className={styles.productLayout}>
        {/* Left Side: Images */}
        <div className={styles.imageGallery}>
          {images.length > 0 ? (
            <>
              <div className={styles.mainImage}>
                <img src={images[activeImageIndex]} alt={product.name} className={styles.productImage} />
              </div>
              {images.length > 1 && (
                <div className={styles.thumbnails}>
                  {images.map((img: string, idx: number) => (
                    <div 
                      key={idx} 
                      className={`${styles.thumbnail} ${activeImageIndex === idx ? styles.thumbnailActive : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className={styles.productImage} />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.mainImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No image available
            </div>
          )}
        </div>

        {/* Right Side: Details */}
        <div className={styles.productInfo}>
          <span className={styles.categoryBadge}>{product.category}</span>
          <h1 className="h1" style={{ marginTop: '16px', marginBottom: '8px' }}>{product.name}</h1>
          
          <div className={styles.priceTagContainer} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            {getPrice(product) < getOriginalPrice(product) && (
              <span className={styles.originalPriceTag} style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.25rem' }}>
                {formatPrice(getOriginalPrice(product))}
              </span>
            )}
            <div className={styles.priceTag} style={{ marginBottom: 0 }}>
              {formatPrice(getPrice(product))}
            </div>
          </div>
          
          <p className={styles.description} style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>

          <div className={styles.actionArea} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={handleAddToCart} className={`btn-primary ${styles.buyButton}`}>
              {added ? '✓ Added to Cart' : `Add to Cart - ${formatPrice(getPrice(product))}`}
            </button>
            <Link href="/checkout" className="btn-secondary" style={{ padding: '16px 24px' }}>
              View Cart
            </Link>
          </div>
          <p className={styles.guarantee} style={{ marginTop: '16px' }}>🔒 Secure checkout via Razorpay. Instant delivery.</p>
        </div>
      </div>
      )}
    </div>
  );
}
