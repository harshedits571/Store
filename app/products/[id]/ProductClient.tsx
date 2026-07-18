'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '../../context/StoreContext';
import { db } from '@/lib/firebase';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCustomLink } from '../../context/CustomLinkContext';
import Skeleton from '../../components/Skeleton';
import styles from './page.module.css';

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { products, initialLoading: loading } = useStore();
  const { addToCart } = useCart();
  const { currency, formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const { applyCustomPrice } = useCustomLink();
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const router = useRouter();

  // Find product from pre-loaded context
  const product = products.find(p => p.id === resolvedParams.id) || null;
  const images = product?.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : (product?.imageUrl ? [product.imageUrl] : []);
  
  useEffect(() => {
    if (product?.hasVersions && product.versions?.length > 0 && !selectedVariantId) {
      setSelectedVariantId(product.versions[0].id);
    }
  }, [product, selectedVariantId]);

  const currentVariant = product?.hasVersions && product?.versions?.length > 0
    ? product.versions.find((v: any) => v.id === selectedVariantId) || product.versions[0]
    : null;

  const isOutOfStock = currentVariant 
    ? currentVariant.stockStatus === 'out_of_stock'
    : product?.stockStatus === 'out_of_stock';

  const effectivePriceValue = currentVariant ? getPrice(currentVariant) : getPrice(product);
  const originalPriceValue = currentVariant ? getOriginalPrice(currentVariant) : getOriginalPrice(product);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: currentVariant ? currentVariant.price : product.price,
      salePrice: currentVariant ? currentVariant.salePrice : product.salePrice,
      inrPrice: currentVariant ? currentVariant.inrPrice : product.inrPrice,
      inrSalePrice: currentVariant ? currentVariant.inrSalePrice : product.inrSalePrice,
      category: product.category,
      requiresLicense: product.requiresLicense ?? true,
      versionId: currentVariant?.id,
      versionName: currentVariant?.name
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: currentVariant ? currentVariant.price : product.price,
      salePrice: currentVariant ? currentVariant.salePrice : product.salePrice,
      inrPrice: currentVariant ? currentVariant.inrPrice : product.inrPrice,
      inrSalePrice: currentVariant ? currentVariant.inrSalePrice : product.inrSalePrice,
      category: product.category,
      requiresLicense: product.requiresLicense ?? true,
      versionId: currentVariant?.id,
      versionName: currentVariant?.name
    });
    router.push('/checkout');
  };

  if (!loading && !product) return <div className="container section" style={{ textAlign: 'center' }}>Product not found.</div>;

  return (
    <div className="container section">
      <Link href="/products" className={styles.backLink}>
        ← Back to Products
      </Link>

      {loading ? (
        <div className={styles.productLayout}>
          <div className={styles.imageGallery}>
            <Skeleton height="500px" borderRadius="24px" />
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <Skeleton height="80px" width="80px" borderRadius="12px" />
              <Skeleton height="80px" width="80px" borderRadius="12px" />
              <Skeleton height="80px" width="80px" borderRadius="12px" />
            </div>
          </div>
          <div className={styles.productInfo} style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', height: 'max-content' }}>
            <Skeleton height="24px" width="100px" borderRadius="100px" style={{ marginBottom: '16px' }} />
            <Skeleton height="40px" width="80%" style={{ marginBottom: '16px' }} />
            <Skeleton height="48px" width="150px" style={{ marginBottom: '32px' }} />
            <Skeleton height="56px" width="100%" borderRadius="12px" style={{ marginBottom: '16px' }} />
            <Skeleton height="56px" width="100%" borderRadius="12px" style={{ marginBottom: '32px' }} />
            <Skeleton height="20px" width="100%" style={{ marginBottom: '12px' }} />
            <Skeleton height="20px" width="100%" style={{ marginBottom: '12px' }} />
            <Skeleton height="20px" width="80%" />
          </div>
        </div>
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
                  style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', aspectRatio: 'auto', background: '#0a0a0a', position: 'relative' }}
                >
                  <img
                    src={images[activeImageIndex]}
                    alt={product.name}
                    className={styles.productImage}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
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
                          background: '#0a0a0a'
                        }}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.mainImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', aspectRatio: '1/1', background: '#0a0a0a', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
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
            style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', height: 'max-content' }}
          >
            <span className={styles.categoryBadge}>{product.category}</span>
            <h1 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '2rem', lineHeight: '1.2', fontWeight: 700 }}>{product.name}</h1>

          {/* Variant Selector or Price Tag */}
          {product.hasVersions && product.versions && product.versions.length > 0 ? (
            <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {product.versions.map((v: any) => {
                const isSelected = selectedVariantId === v.id;
                const vPrice = getPrice(v);
                const vOriginalPrice = getOriginalPrice(v);
                const vFinalPrice = applyCustomPrice(product.id, vPrice, currency);
                
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '20px',
                      borderRadius: '16px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-secondary)',
                      border: `2px solid ${isSelected ? '#3B82F6' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'left',
                      boxShadow: isSelected 
                        ? '0 8px 24px rgba(59, 130, 246, 0.12)' 
                        : 'inset 0 0 0 1px var(--border-subtle)',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      {/* Price Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: isSelected ? '#3B82F6' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        minWidth: '110px',
                        letterSpacing: '-0.02em',
                        transition: 'all 0.2s ease',
                        border: isSelected ? 'none' : '1px solid var(--border-subtle)'
                      }}>
                        {formatPrice(vFinalPrice)}
                      </div>

                      {/* Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: '1.25rem', 
                          color: isSelected ? '#3B82F6' : 'var(--text-primary)',
                          transition: 'color 0.2s ease'
                        }}>
                          {v.name}
                        </span>
                        
                        {(vFinalPrice < vOriginalPrice || v.stockStatus === 'out_of_stock') && (
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {vFinalPrice < vOriginalPrice && (
                              <span style={{ fontSize: '0.875rem', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                Save {formatPrice(vOriginalPrice - vFinalPrice)}
                                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '4px', fontWeight: 500 }}>
                                  {formatPrice(vOriginalPrice)}
                                </span>
                              </span>
                            )}
                            {v.stockStatus === 'out_of_stock' && (
                              <span style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                Out of Stock
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Radio Button Indicator */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#3B82F6' : 'var(--text-muted)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? '#3B82F6' : 'transparent',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.priceTagContainer} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div className={styles.priceTag} style={{ marginBottom: 0, fontSize: '3rem' }}>
                {formatPrice(applyCustomPrice(product.id, effectivePriceValue, currency))}
              </div>
              {applyCustomPrice(product.id, effectivePriceValue, currency) < originalPriceValue && (
                <>
                  <span className={styles.originalPriceTag} style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.25rem' }}>
                    {formatPrice(originalPriceValue)}
                  </span>
                  <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '6px 12px', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 700 }}>
                    Save {formatPrice(originalPriceValue - applyCustomPrice(product.id, effectivePriceValue, currency))}
                  </span>
                </>
              )}
            </div>
          )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <motion.button
                onClick={handleAddToCart}
                className={`btn-primary ${styles.buyButton}`}
                disabled={isOutOfStock}
                whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
                style={{ width: '100%', padding: '16px', fontSize: '1.125rem', opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
              >
                {isOutOfStock ? 'Out of Stock' : added ? '✓ Added to Cart' : `Add to Cart`}
              </motion.button>
              <button
                onClick={handleBuyNow}
                className="btn-secondary"
                disabled={isOutOfStock}
                style={{ width: '100%', padding: '16px', textAlign: 'center', fontSize: '1.125rem', background: isOutOfStock ? 'var(--bg-secondary)' : '#FCD34D', color: isOutOfStock ? 'var(--text-muted)' : '#000', border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer', borderRadius: '8px', fontWeight: 600 }}
              >
                Buy Now
              </button>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ color: '#10B981' }}>🔒</span> Guaranteed Safe Checkout
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                {/* UPI */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-subtle)', height: '32px' }} title="UPI">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" style={{ height: '14px', objectFit: 'contain' }} />
                </div>
                {/* Visa */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-subtle)', height: '32px', width: '50px' }} title="Visa">
                  <img src="/Visa.webp" alt="Visa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                {/* Mastercard */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-subtle)', height: '32px' }} title="Mastercard">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" style={{ height: '18px', objectFit: 'contain' }} />
                </div>
                {/* RuPay */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-subtle)', height: '32px' }} title="RuPay">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg" alt="RuPay" style={{ height: '16px', objectFit: 'contain' }} />
                </div>
                {/* Paytm (Wallet) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid var(--border-subtle)', height: '32px' }} title="Paytm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" alt="Paytm" style={{ height: '10px', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Powered by <strong style={{ color: '#3395FF' }}>Razorpay</strong>
              </div>
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
