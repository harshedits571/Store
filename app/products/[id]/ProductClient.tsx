'use client';
import { useState, useEffect, use } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '../../context/StoreContext';
import { db } from '@/lib/firebase';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCustomLink } from '../../context/CustomLinkContext';
import Skeleton from '../../components/Skeleton';
import PaymentTrustBadges from '../../components/PaymentTrustBadges';
import styles from './page.module.css';
import ProductReviews from './ProductReviews';

// Animated Countdown Price Drop Component
function AnimatedPriceDrop({
  targetPrice,
  originalPrice,
  formatPrice,
}: {
  targetPrice: number;
  originalPrice: number;
  formatPrice: (v: number) => string;
}) {
  const [currentVal, setCurrentVal] = useState<number>(() => (originalPrice > targetPrice ? originalPrice : targetPrice));
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const start = originalPrice > targetPrice ? originalPrice : targetPrice * 2 || 999;
    const end = targetPrice;

    if (start === end) {
      setCurrentVal(end);
      setIsFinished(true);
      return;
    }

    const duration = 1400; // ms
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easeOutExpo for dramatic slowdown at the end
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const val = start - (start - end) * ease;
      setCurrentVal(Math.round(val));

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setCurrentVal(end);
        setIsFinished(true);
      }
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [targetPrice, originalPrice]);

  return (
    <motion.span
      key={`${targetPrice}-${originalPrice}`}
      initial={{ scale: 1.12, filter: 'drop-shadow(0 2px 8px rgba(239, 68, 68, 0.4))' }}
      animate={{ 
        scale: isFinished ? 1 : [1.12, 1.06, 1],
        filter: isFinished ? 'none' : 'drop-shadow(0 2px 10px rgba(0, 113, 227, 0.3))'
      }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      style={{
        display: 'inline-block',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.03em',
        color: isFinished ? 'var(--text-primary)' : '#0071e3',
        fontWeight: 800
      }}
    >
      {formatPrice(currentVal)}
    </motion.span>
  );
}

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { products, initialLoading: loading, homepageSettings: s } = useStore();
  const { addToCart, isCartOpen } = useCart();
  const { currency, formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const { applyCustomPrice } = useCustomLink();
  const [mounted, setMounted] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      versionName: currentVariant?.name,
      isSubscription: currentVariant ? currentVariant.isSubscription : product.isSubscription,
      planId: currentVariant ? currentVariant.planId : product.planId
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
      versionName: currentVariant?.name,
      isSubscription: currentVariant ? currentVariant.isSubscription : product.isSubscription,
      planId: currentVariant ? currentVariant.planId : product.planId
    });
    router.push('/checkout');
  };

  if (!loading && !product) return <div className="container section" style={{ textAlign: 'center' }}>Product not found.</div>;

  return (
    <>
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
        <div className={styles.gumroadContainer}>
          {/* Top: Image Gallery */}
          <motion.div
            className={styles.heroImageContainer}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {images.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div
                  style={{ overflow: 'hidden', borderRadius: '28px', aspectRatio: 'auto', background: '#0a0a0a', position: 'relative' }}
                >
                  <img
                    src={images[activeImageIndex]}
                    alt={product.name}
                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70vh', objectFit: 'contain', borderRadius: '28px' }}
                  />
                </div>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 24px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', aspectRatio: '16/9', background: '#0a0a0a' }}>
                No image available
              </div>
            )}
          </motion.div>

          <div className={styles.contentGrid}>
            {/* Left Side: Details */}
            <motion.div
              className={styles.leftColumn}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className={styles.productTitle}>{product.name}</h1>
              
              <div className={styles.creatorBadge}>
                <div className={styles.creatorAvatar}>
                  <img
                    src={s?.creatorAvatarUrl || '/fabicone.png'}
                    alt={s?.creatorName || 'Crevo Store'}
                    onError={(e) => { e.currentTarget.src = '/fabicone.png'; }}
                  />
                </div>
                <span className={styles.creatorName}>{s?.creatorName || 'Crevo Store'}</span>
              </div>
              
              <div className={styles.descriptionSection}>
                <h2 className={styles.sectionTitle}>{product.name}</h2>
                <p className={styles.description} style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
              </div>

              {product.presetList && product.presetList.length > 0 && (
                <div className={styles.whatsIncluded}>
                  <h2 className={styles.sectionTitle}>
                    <span style={{ fontSize: '1.25rem' }}>📦</span> What's Included
                  </h2>
                  <div style={{ marginTop: '12px' }}>
                    {product.presetList.map((item: string, idx: number) => (
                      <div key={idx} className={styles.presetItem} style={{ marginBottom: '8px', fontSize: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={styles.presetIcon}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right Side: Checkout / Variants */}
            <motion.div
              className={styles.rightColumn}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Variant Selector or Price Tag */}
              {product.hasVersions && product.versions && product.versions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                          padding: '16px',
                          borderRadius: '8px',
                          background: 'var(--bg-card)',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'left',
                          outline: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {/* Radio Dot */}
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isSelected && (
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                            )}
                          </div>
                          
                          {/* Details */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              {v.name}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {v.isSubscription ? `Subscription (${v.billingPeriod || 'Monthly'})` : 'One-Time Payment'}
                            </span>
                            {(vFinalPrice < vOriginalPrice || v.stockStatus === 'out_of_stock') && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {vFinalPrice < vOriginalPrice && (
                                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                                    Save {formatPrice(vOriginalPrice - vFinalPrice)}
                                  </span>
                                )}
                                {v.stockStatus === 'out_of_stock' && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                           <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                             {formatPrice(vFinalPrice)}
                           </span>
                           {vFinalPrice < vOriginalPrice && (
                             <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '0.85rem' }}>
                               {formatPrice(vOriginalPrice)}
                             </span>
                           )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px', 
                  padding: '18px 24px', 
                  background: 'var(--bg-card)', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Final Animated Price */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.1 }}>
                      <AnimatedPriceDrop
                        targetPrice={applyCustomPrice(product.id, effectivePriceValue, currency)}
                        originalPrice={originalPriceValue}
                        formatPrice={formatPrice}
                      />
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                      {product.isSubscription ? `Subscription (${product.billingPeriod || 'Monthly'})` : 'One-Time Payment'}
                    </div>
                  </div>

                  {/* Strikethrough Old Price & Savings Badge */}
                  {applyCustomPrice(product.id, effectivePriceValue, currency) < originalPriceValue && (
                    <motion.div 
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}
                    >
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.05rem', fontWeight: 600 }}>
                        {formatPrice(originalPriceValue)}
                      </span>
                      <motion.span 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: [0.9, 1.08, 1] }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        style={{ color: '#10B981', fontSize: '0.875rem', fontWeight: 700 }}
                      >
                        Save {formatPrice(originalPriceValue - applyCustomPrice(product.id, effectivePriceValue, currency))}
                      </motion.span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <motion.button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    fontSize: '1.125rem', 
                    fontWeight: 700,
                    background: isOutOfStock ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                    color: isOutOfStock ? 'var(--text-muted)' : '#fff', 
                    border: 'none', 
                    borderRadius: '8px',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                  }}
                >
                  I want this!
                </motion.button>
              </div>

              {/* Secondary Actions */}
              <div className={styles.secondaryActions}>
                <button className={styles.wishlistBtn} onClick={handleAddToCart}>
                  {added ? '✓ Added' : 'Add to cart'}
                </button>
                <button className={styles.shareBtn} onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: product.name, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard');
                  }
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
              </div>
              
              {/* Guaranteed Safe Checkout Trust Badges */}
              <PaymentTrustBadges />
            </motion.div>
          </div>
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

          {/* Customer Reviews */}
          <ProductReviews productId={product.id} productName={product.name} />

          {/* Related Products Grid */}
          <div className={styles.relatedSection} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className={styles.relatedTitle}>You May Also Like</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {products.filter(p => p.id !== product.id).slice(0, 3).map(related => {
                const getRelatedDisplayPrice = () => {
                  if (related.hasVersions && related.versions?.length > 0) {
                    const prices = related.versions.map((v: any) => getPrice(v));
                    const minPrice = Math.min(...prices);
                    return minPrice === 0 ? 'Free' : `From ${formatPrice(minPrice)}`;
                  }
                  return formatPrice(getPrice(related));
                };

                const getRelatedOriginalPrice = () => {
                  if (related.hasVersions && related.versions?.length > 0) {
                    return getOriginalPrice(related.versions[0]);
                  }
                  return getOriginalPrice(related);
                };

                const effectivePrice = related.hasVersions && related.versions?.length > 0
                  ? Math.min(...related.versions.map((v: any) => getPrice(v)))
                  : getPrice(related);
                const origPrice = getRelatedOriginalPrice();

                return (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {effectivePrice < origPrice && origPrice > 0 && (
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              {formatPrice(origPrice)}
                            </span>
                          )}
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.125rem' }}>
                            {getRelatedDisplayPrice()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Mobile Sticky Floating Bottom Action Bar */}
      {mounted && product && !isCartOpen && createPortal(
        <div className={styles.mobileStickyBottomBar}>
          {/* Left: Product info */}
          <div className={styles.stickyProductInfo}>
            <span className={styles.stickyProductName}>{product.name}</span>
            <div className={styles.stickyPriceTag}>
              <span>{formatPrice(applyCustomPrice(product.id, effectivePriceValue, currency))}</span>
              {product.hasVersions && <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>+</span>}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className={styles.stickyActions}>
            <button 
              onClick={handleAddToCart}
              className={styles.stickyCartBtn}
              aria-label="Add to cart"
              title="Add to cart"
            >
              {added ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              )}
            </button>
            <button 
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={styles.stickyBuyBtn}
            >
              {isOutOfStock ? 'Out of Stock' : 'I want this!'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
