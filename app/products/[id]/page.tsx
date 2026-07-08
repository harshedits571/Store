'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
        <motion.div 
          className={styles.imageGallery}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {images.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Main Image */}
              <div 
                className={styles.mainImage} 
                style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', aspectRatio: '1/1', background: 'var(--bg-secondary)', position: 'relative' }}
              >
                <img 
                  src={images[activeImageIndex]} 
                  alt={product.name} 
                  className={styles.productImage} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }} 
                />
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {images.map((img: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveImageIndex(idx)}
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        flexShrink: 0,
                        borderRadius: '12px', 
                        overflow: 'hidden', 
                        border: activeImageIndex === idx ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        opacity: activeImageIndex === idx ? 1 : 0.6,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: 'var(--bg-secondary)'
                      }}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.mainImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', aspectRatio: '1/1', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
              No image available
            </div>
          )}
        </motion.div>

        {/* Right Side: Details */}
        <motion.div 
          className={styles.productInfo}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', position: 'sticky', top: '120px', height: 'max-content' }}
        >
          <span className={styles.categoryBadge}>{product.category}</span>
          <h1 className="h1" style={{ marginTop: '16px', marginBottom: '8px' }}>{product.name}</h1>
          
          <div className={styles.priceTagContainer} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div className={styles.priceTag} style={{ marginBottom: 0, fontSize: '3rem' }}>
              {formatPrice(getPrice(product))}
            </div>
            {getPrice(product) < getOriginalPrice(product) && (
              <>
                <span className={styles.originalPriceTag} style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.25rem' }}>
                  {formatPrice(getOriginalPrice(product))}
                </span>
                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '6px 12px', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 700 }}>
                  Save {formatPrice(getOriginalPrice(product) - getPrice(product))}
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <motion.button 
              onClick={handleAddToCart} 
              className={`btn-primary ${styles.buyButton}`}
              whileTap={{ scale: 0.95 }}
              style={{ width: '100%', padding: '16px', fontSize: '1.125rem' }}
            >
              {added ? '✓ Added to Cart' : `Add to Cart`}
            </motion.button>
            <Link href="/checkout" className="btn-secondary" style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: '1.125rem', background: '#FCD34D', color: '#000', border: 'none' }}>
              Buy Now
            </Link>
          </div>
          
          <details style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }} open>
            <summary style={{ fontWeight: 600, cursor: 'pointer', outline: 'none' }}>Description</summary>
            <p className={styles.description} style={{ whiteSpace: 'pre-wrap', marginTop: '12px', fontSize: '0.95rem' }}>{product.description}</p>
          </details>

          {/* Preset List / What's Included */}
          {product.presetList && product.presetList.length > 0 && (
            <details style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }} open>
              <summary style={{ fontWeight: 600, cursor: 'pointer', outline: 'none' }}>Presets List</summary>
              <div style={{ marginTop: '12px' }}>
                {product.presetList.map((item: string, idx: number) => (
                  <div key={idx} className={styles.presetItem} style={{ marginBottom: '8px', fontSize: '0.95rem' }}>
                    <span className={styles.presetIcon}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '32px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>✉️</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Instant Delivery</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Sent via Email</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Drag and Drop</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Easy to apply</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Commercial License</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Use anywhere</div>
            </div>
          </div>
        </motion.div>
      </div>
      )}

      {/* Long-Form Sections */}
      {product && (
        <div style={{ padding: '0 24px' }}>
          
          {/* Features Zig-Zag */}
          {product.features && product.features.length > 0 && (
            <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid var(--border-subtle)', marginTop: '80px' }}>
              {product.features.map((feature: any, idx: number) => (
                <motion.div 
                  key={idx}
                  className={idx % 2 === 0 ? styles.featureSection : styles.featureSectionReverse}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <div className={styles.featureImageWrapper}>
                    {feature.imageUrl ? (
                      <img src={feature.imageUrl} alt={feature.title} className={styles.featureImage} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Image Placeholder</div>
                    )}
                  </div>
                  <div className={styles.featureContent}>
                    <h2 className={styles.featureTitle}>{feature.title}</h2>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Watch it in action Video */}
          {product.videoUrl && (
            <div className={styles.videoSection}>
              <h2 className={styles.videoSectionTitle}>Watch it in Action</h2>
              <motion.div 
                className={styles.videoWrapper}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {product.videoUrl.includes('youtube.com') || product.videoUrl.includes('youtu.be') ? (
                  <iframe 
                    src={product.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                ) : (
                  <video 
                    src={product.videoUrl} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                    autoPlay muted loop playsInline controls 
                  />
                )}
              </motion.div>
            </div>
          )}

          {/* Related Products Grid */}
          <div className={styles.relatedSection} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className={styles.relatedTitle}>You May Also Like</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {products.filter(p => p.id !== product.id).slice(0, 3).map(related => (
                <Link key={related.id} href={`/products/${related.id}`} style={{ textDecoration: 'none' }}>
                  <motion.div 
                    whileHover={{ y: -8 }}
                    style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ aspectRatio: '1', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <img src={(related.imageUrls && related.imageUrls[0]) || related.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{related.name}</h3>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.125rem' }}>
                        ${related.salePrice || related.price}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
