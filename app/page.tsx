'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useStore } from './context/StoreContext';
import { useCart } from './context/CartContext';
import { useCurrency } from './context/CurrencyContext';
import { CustomLinkProvider } from './context/CustomLinkContext';
import HeroMockup from './components/HeroMockup';
import Skeleton from './components/Skeleton';
import styles from './page.module.css';

/* ═══════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/* ── Scroll-triggered section reveal ── */
function Section({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated number counter ── */
function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const duration = 1500;
    const steps = duration / 16;
    const increment = target / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, decimals]);

  return <span ref={ref}>{decimals > 0 ? count.toFixed(decimals) : count}{suffix}</span>;
}

/* ── Infinite marquee ticker ── */
function Marquee() {
  const items = ['PREMIUM EDITIONS', 'ORIGINAL CONTENT', 'EXCLUSIVE RESOURCES', 'PRO ASSETS'];
  const doubled = [...items, ...items, ...items];
  return (
    <div className={styles.marqueeWrap}>
      <div className={styles.marqueeTrack}>
        {doubled.map((item, i) => (
          <span key={i} className={styles.marqueeItem}>
            {item} <span className={styles.marqueeStar}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const { products, initialLoading, homepageSettings: s } = useStore();
  const { addToCart } = useCart();
  const { formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [bundleAdded, setBundleAdded] = useState(false);

  /* ── Data ── */
  const featured = s.featuredProductIds && s.featuredProductIds.length > 0
    ? (s.featuredProductIds.map((id: string) => products.find(p => p.id === id)).filter(Boolean) as typeof products)
    : products;

  const handleAddBundle = () => {
    addToCart({
      id: 'bundle',
      name: s.bundleTitle || 'Premium Bundle',
      price: Number(s.bundlePrice) || 0,
      inrPrice: s.bundleInrPrice ? Number(s.bundleInrPrice) : undefined,
      category: 'Bundle',
      requiresLicense: true,
      productIds: s.bundleProductIds || []
    });
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 2000);
  };

  /* ── Loading splash ── */
  if (initialLoading) {
    return (
      <div className={styles.page}>
        <section className={styles.hero} style={{ paddingTop: '100px', paddingBottom: '100px' }}>
          <div className={styles.heroContent} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Skeleton width="60%" height="80px" style={{ marginBottom: '24px' }} />
            <Skeleton width="40%" height="40px" style={{ marginBottom: '32px' }} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <Skeleton width="150px" height="50px" borderRadius="100px" />
              <Skeleton width="150px" height="50px" borderRadius="100px" />
            </div>
          </div>
        </section>
        
        <section className="section" style={{ padding: '80px 24px' }}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <Skeleton width="200px" height="40px" style={{ marginBottom: '40px' }} />
            </div>
            <div className={styles.productGrid}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.productCard} style={{ overflow: 'hidden' }}>
                  <Skeleton width="100%" height="250px" borderRadius="0" />
                  <div className={styles.productBody} style={{ padding: '24px' }}>
                    <Skeleton width="70%" height="24px" style={{ marginBottom: '12px' }} />
                    <Skeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="80%" height="16px" style={{ marginBottom: '24px' }} />
                    <div className={styles.productFooter}>
                      <Skeleton width="60px" height="24px" />
                      <Skeleton width="80px" height="24px" borderRadius="100px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <motion.h1 
            className={styles.heroTitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {s.heroTitleLine1 || 'ELEVATE YOUR'}<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #111827 0%, #4B5563 50%, #111827 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              {s.heroTitleLine2 || 'CREATIVE VISION'}
            </span>
          </motion.h1>

          <motion.p 
            className={styles.heroSubtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {s.heroSubtitle || 'Pro-grade VFX packs, motion presets, and editing tools engineered for next-generation visual storytellers.'}
          </motion.p>

          <motion.div 
            className={styles.heroCtas}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/products" className="btn-primary">
              Explore Assets
            </Link>
            <button onClick={handleAddBundle} className="btn-secondary">
              Get the Bundle
            </button>
          </motion.div>
        </div>
      </section>
      {/* ── NEW COOL HERO MOCKUP ── */}
      <HeroMockup />

      {/* ── Stats ── */}
      <motion.div
        className={styles.heroStats}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className={styles.stat}>
          <span className={styles.statNumber}><CountUp target={500} suffix="+" /></span>
          <span className={styles.statLabel}>Members</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNumber}><CountUp target={50} suffix="+" /></span>
          <span className={styles.statLabel}>Assets</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNumber}><CountUp target={4.9} decimals={1} /></span>
          <span className={styles.statLabel}>Rating</span>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════
          FEATURED PRODUCTS (Nordic Sections style)
          ════════════════════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <Section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Sections</h2>
            </div>
          </Section>

          <div className={styles.productGrid}>
            {featured.map((p, i) => {
              const img = p.imageUrls?.[0] || p.imageUrl || '';
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link href={`/products/${p.id}`} className={styles.productCard}>
                    <div className={styles.productImage} style={img ? { backgroundImage: `url(${img})` } : { background: 'var(--bg-secondary)' }}>
                      <span className={styles.categoryBadge}>{p.category}</span>
                      {p.stockStatus === 'out_of_stock' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                          Out of Stock
                        </div>
                      )}
                    </div>
                    <div className={styles.productBody} style={{ opacity: p.stockStatus === 'out_of_stock' ? 0.6 : 1 }}>
                      <h3 className={styles.productTitle}>{p.name}</h3>
                      <p className={styles.productDesc}>{p.description}</p>
                      <div className={styles.productFooter}>
                        <span className={styles.productPrice}>
                          {formatPrice(getPrice(p))}
                        </span>
                        <span className={styles.productBtn}>Click</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW WE KEEP YOU AHEAD / WHY CHOOSE US
          ════════════════════════════════════════════════════ */}
      <section className={styles.aheadSection}>
        <div className="container">
          <Section>
            <div className={styles.aheadHeader}>
              <h2 className={styles.aheadTitle}>Why Choose Us®</h2>
              <p className={styles.aheadSub1}>
                From instant asset delivery to lifetime updates, we give you every advantage in your creative workflow.
              </p>
              <p className={styles.aheadSub2}>
                Here's how we deliver on that promise every day.
              </p>
            </div>
          </Section>

          <Section delay={0.2}>
            <div className={styles.aheadGrid}>
              {/* Card 1: Electric Azure Glow */}
              <div className={`${styles.aheadCard} ${styles.aheadCardBlue1}`}>
                <div>
                  <div className={styles.aheadIconBox}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L3 14h7v8l10-12h-7z" />
                    </svg>
                  </div>
                  <h3 className={styles.aheadCardTitle}>Instant Delivery</h3>
                  <p className={styles.aheadCardText}>
                    Your shortcut to staying ahead—delivered the second you check out.
                  </p>
                </div>
                <div>
                  <Link href="/products" className={styles.aheadCardLink}>
                    <span>Get Instant Access</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card 2: Deep Sapphire Glow */}
              <div className={`${styles.aheadCard} ${styles.aheadCardBlue2}`}>
                <div>
                  <div className={styles.aheadIconBox}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.4-2.4c.4-.4.4-1 0-1.3z" />
                    </svg>
                  </div>
                  <h3 className={styles.aheadCardTitle}>Curated Assets</h3>
                  <p className={styles.aheadCardText}>
                    The most powerful plugins and digital assets—tested and reviewed by industry professionals.
                  </p>
                </div>
                <div>
                  <Link href="/products" className={styles.aheadCardLink}>
                    <span>Explore Catalog</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card 3: Cyan Sky Glow */}
              <div className={`${styles.aheadCard} ${styles.aheadCardBlue3}`}>
                <div>
                  <div className={styles.aheadIconBox}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                  </div>
                  <h3 className={styles.aheadCardTitle}>Lifetime Updates</h3>
                  <p className={styles.aheadCardText}>
                    Buy once, get updates forever. Plus priority creator support whenever you need assistance.
                  </p>
                </div>
                <div>
                  <Link href="/products" className={styles.aheadCardLink}>
                    <span>Unlock Benefits</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </Section>

          {/* Bottom Feature Tags */}
          <Section delay={0.3}>
            <div className={styles.aheadFeaturePills}>
              <div className={styles.aheadPillItem}>
                <div className={styles.aheadPillIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7v8l10-12h-7z"/></svg>
                </div>
                <span>Always Current</span>
              </div>
              <div className={styles.aheadPillItem}>
                <div className={styles.aheadPillIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
                </div>
                <span>100% Secure Checkout</span>
              </div>
              <div className={styles.aheadPillItem}>
                <div className={styles.aheadPillIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
                </div>
                <span>Actionable Assets</span>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS TIMELINE
          ════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg-secondary)', padding: '100px 24px' }}>
        <div className="container">
          <Section>
            <div className={styles.sectionHeader} style={{ textAlign: 'center', marginBottom: '80px' }}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
            </div>
          </Section>

          <div className={styles.timeline}>
            {[
              { title: 'Browse the Catalog', text: 'Explore our curated selection of high-quality digital assets, plugins, and resources.' },
              { title: 'Secure Purchase', text: 'Checkout quickly and securely. Your payment is encrypted and processed instantly.' },
              { title: 'Instant Download', text: 'Get your license key and download link immediately via email and on the success page.' }
            ].map((step, i) => (
              <Section key={i} delay={i * 0.2}>
                <div className={styles.timelineStep}>
                  <div className={styles.stepNumber}>{i + 1}</div>
                  <div className={styles.stepContent}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepText}>{step.text}</p>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SPLIT BANNER (For Bundle)
          ════════════════════════════════════════════════════ */}
      {(s.bundleTitle || s.bundlePrice > 0 || (s.bundleItems && s.bundleItems.length > 0)) && (
        <section className="section" style={{ padding: '80px 24px' }}>
          <div className="container">
            <Section>
              <div className={styles.splitBanner}>
                <div 
                  className={styles.splitBannerLeft} 
                  style={s.bundleBgUrl ? { 
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${s.bundleBgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : {}}
                >
                  <h2 className={styles.bundleHeading}>{s.bundleTitle || 'Exclusive Bundle'}</h2>
                  <div className={styles.bundlePriceRow} style={{ marginBottom: '24px' }}>
                    <span className={styles.salePrice}>{formatPrice(getPrice({ price: s.bundlePrice, inrPrice: s.bundleInrPrice }))}</span>
                    <span className={styles.originalPrice}>{formatPrice(getPrice({ price: s.bundleOriginalPrice, inrPrice: s.bundleInrOriginalPrice }))}</span>
                  </div>
                  <button onClick={handleAddBundle} className="btn-primary" style={{ background: 'white', color: 'var(--accent-primary)', width: 'fit-content' }}>
                    {bundleAdded ? 'Added to Cart!' : 'Get Lifetime Access'}
                  </button>
                </div>
                <div className={styles.splitBannerRight}>
                  <h3 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>The Ultimate Collection.</h3>
                  <p className={styles.bundleSub}>{s.bundleSub || "Get instant lifetime access to our entire premium library. Everything you need in one package."}</p>
                  <div className={styles.bundleList}>
                    {s.bundleItems?.map((item: string, i: number) => (
                      <div key={i} className={styles.bundleItem} style={{ marginBottom: '12px' }}>
                        <span className={styles.checkIcon} style={{ color: 'var(--success)', marginRight: '12px', fontWeight: 'bold' }}>✓</span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════
          CREATOR BIOGRAPHY
          ════════════════════════════════════════════════════ */}
      {s.bioTitle && (
        <section className="section" style={{ padding: '100px 24px', background: 'var(--bg-glass)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <Section>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '64px', alignItems: 'center' }}>
                {s.bioImageUrl && (
                  <div style={{ flex: '1 1 400px', borderRadius: '32px', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
                    <img src={s.bioImageUrl} alt="Creator" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', aspectRatio: '4/5' }} />
                  </div>
                )}
                <div style={{ flex: '1 1 500px' }}>
                  <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '32px', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.bioTitle}</h2>
                  {s.bioText1 && <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>{s.bioText1}</p>}
                  {s.bioText2 && <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.bioText2}</p>}
                </div>
              </div>
            </Section>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════
          TESTIMONIALS (Apple Marquee)
          ════════════════════════════════════════════════════ */}
      {s.testimonials && s.testimonials.length > 0 && (
        <section className="section" style={{ padding: '60px 0', overflow: 'hidden' }}>
          <Section>
            <div className={styles.sectionHeader} style={{ textAlign: 'center' }}>
              <h2 className={styles.sectionTitle}>Loved by Creators</h2>
            </div>
          </Section>
          
          <div className={styles.testimonialsWrap}>
            <div className={styles.testimonialsTrack}>
              {[...s.testimonials, ...s.testimonials].map((t: any, i: number) => (
                <div key={i} className={styles.testimonialCard}>
                  <div className={styles.testimonialStars}>★★★★★</div>
                  <p className={styles.testimonialText}>"{t.text}"</p>
                  <div className={styles.testimonialAuthor}>{t.name} • {t.handle}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════
          FAQ
          ════════════════════════════════════════════════════ */}
      {s.faqs && s.faqs.length > 0 && (
        <section className="section" style={{ padding: '80px 24px', background: 'var(--bg-secondary)' }}>
          <div className="container">
            <Section>
              <div className={styles.sectionHeader} style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h2 className={styles.sectionTitle}>Questions?</h2>
                <p className={styles.sectionSubtitle} style={{ margin: '0 auto' }}>Everything you need to know about our products and billing.</p>
              </div>
            </Section>

            <div className={styles.faqList}>
              {s.faqs.map((faq: any, i: number) => (
                <Section key={i} delay={i * 0.1}>
                  <div className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                    <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      <span>{faq.q}</span>
                      <span className={styles.faqIcon}>+</span>
                    </button>
                    <div className={styles.faqAnswer}>
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
