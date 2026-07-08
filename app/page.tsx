'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from './context/StoreContext';
import { useCart } from './context/CartContext';
import { useCurrency } from './context/CurrencyContext';
import styles from './page.module.css';

/* ── Scroll-reveal wrapper ── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // On mobile/touch devices, use a timeout fallback in case IntersectionObserver
    // doesn't fire due to smooth-scroll library interference
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isTouchDevice) {
      timeout = setTimeout(() => setActive(true), 2000);
    }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.unobserve(el);
          if (timeout) clearTimeout(timeout);
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={ref} className={`${className} reveal ${active ? 'revealActive' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export default function Home() {
  const { products, initialLoading, homepageSettings: s } = useStore();
  const { addToCart } = useCart();
  const { formatPrice, getPrice, getOriginalPrice } = useCurrency();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [bundleAdded, setBundleAdded] = useState(false);

  /* Mouse-follower glow */
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let animationFrameId: number;
    const move = (e: MouseEvent) => {
      if (glowRef.current) {
        animationFrameId = requestAnimationFrame(() => {
          // Using clientX/clientY keeps it fixed to the screen viewport
          glowRef.current!.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        });
      }
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const featured = products.filter(p =>
    s.featuredProductIds?.length ? s.featuredProductIds.includes(p.id) : true
  ).slice(0, 6);

  const handleAddBundle = () => {
    // Add a single "Bundle" item representing all selected products
    addToCart({
      id: 'bundle',
      name: s.bundleTitle || 'Premium Bundle',
      price: Number(s.bundlePrice) || 0,
      inrPrice: s.bundleInrPrice ? Number(s.bundleInrPrice) : undefined,
      category: 'Bundle',
      requiresLicense: true, // Generate a master license for the bundle
      productIds: s.bundleProductIds || [] // Pass the specific products this bundle unlocks
    });
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 2000);
  };

  /* Loading splash */
  if (initialLoading) {
    return (
      <div className={styles.splash}>
        <div className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Creative Store</div>
        <div className={styles.splashBar} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Background grid & glows */}
      <div className={styles.heroBg}>
        <div className={styles.heroGrid} />
        <div className={`${styles.heroGlow} ${styles.glow1}`} />
        <div className={`${styles.heroGlow} ${styles.glow2}`} />
      </div>

      {/* Mouse-follower glow */}
      <div ref={glowRef} className={styles.mouseGlow} style={{ top: 0, left: 0 }} />

      {/* ════════ HERO ════════ */}
      <section className={styles.hero}>
        <Reveal className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            Premium Digital Assets
          </div>

          <h1 className={styles.heroTitle}>
            <span className="text-gradient">{s.heroTitleLine1}</span>
            <br />
            {s.heroTitleLine2}
          </h1>

          <p className={styles.heroSubtitle}>{s.heroSubtitle}</p>

          <div className={styles.heroCtas}>
            <Link href="/products" className="btn-primary" style={{ padding: '16px 36px', fontSize: '17px', borderRadius: '14px' }}>
              Explore Assets
            </Link>
            <button onClick={handleAddBundle} className="btn-secondary" style={{ padding: '16px 36px', fontSize: '17px', borderRadius: '14px' }}>
              Get the Bundle
            </button>
          </div>

          {/* Stats strip */}
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Happy Customers</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Premium Assets</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNumber}>4.9</span>
              <span className={styles.statLabel}>Avg. Rating</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ BUNDLE CTA ════════ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className={styles.bundleCard}>
              <span className={styles.bundleValue}>{s.bundleBadge}</span>
              <h2 className={styles.bundleHeading}>{s.bundleTitle}</h2>
              <p className={styles.bundleSub}>{s.bundleSub || "Get instant lifetime access to our entire premium library. One payment, zero limits."}</p>

              <div className={styles.bundleList}>
                {s.bundleItems?.map((item: string, i: number) => (
                  <div key={i} className={styles.bundleItem}><span className={styles.checkIcon}>✓</span> {item}</div>
                ))}
              </div>

              <div className={styles.bundlePriceRow}>
                <span className={styles.originalPrice}>{formatPrice(getPrice({ price: s.bundleOriginalPrice, inrPrice: s.bundleInrOriginalPrice }))}</span>
                <span className={styles.salePrice}>{formatPrice(getPrice({ price: s.bundlePrice, inrPrice: s.bundleInrPrice }))}</span>
              </div>

              <button onClick={handleAddBundle} className={`btn-primary ${styles.bundleCTA}`}>
                {bundleAdded ? '✓ Added to Cart!' : 'GET THE BUNDLE NOW'}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ FEATURED PRODUCTS ════════ */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <Reveal>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>FEATURED</span>
              <h2 className={styles.sectionTitle}>Popular Creations</h2>
              <p className={styles.sectionSubtitle}>Individual tools built to address specific editor struggles.</p>
            </div>
          </Reveal>

          <div className={styles.productGrid}>
            {featured.map((p, i) => {
              const img = p.imageUrls?.[0] || p.imageUrl || '';
              return (
                <Reveal key={p.id} delay={i * 0.1}>
                  <Link href={`/products/${p.id}`} className={styles.productCard}>
                    <div className={styles.productImage} style={img ? { backgroundImage: `url(${img})` } : { background: 'var(--bg-card)' }}>
                      <span className={styles.categoryBadge}>{p.category}</span>
                    </div>
                    <div className={styles.productBody}>
                      <h3 className={styles.productTitle}>{p.name}</h3>
                      <p className={styles.productDesc}>{p.description}</p>
                    </div>
                    <div className={styles.productFooter}>
                      <span className={styles.productPrice} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getPrice(p) < getOriginalPrice(p) && (
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal' }}>
                            {formatPrice(getOriginalPrice(p))}
                          </span>
                        )}
                        {formatPrice(getPrice(p))}
                      </span>
                      <span className={styles.productBtn}>View Details</span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link href="/products" className="btn-secondary" style={{ padding: '14px 32px' }}>View All Assets →</Link>
          </div>
        </div>
      </section>

      {/* ════════ TESTIMONIALS ════════ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>TESTIMONIALS</span>
              <h2 className={styles.sectionTitle}>Trusted By Professional Editors</h2>
            </div>
          </Reveal>

          <div className={styles.testimonialsGrid}>
            {s.testimonials?.map((t: any, i: number) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className={styles.testimonialCard}>
                  <div className={styles.testimonialHeader}>
                    <div className={styles.avatar}>{t.name?.[0] || 'U'}</div>
                    <div>
                      <div className={styles.testimonialName}>{t.name}</div>
                      <div className={styles.testimonialHandle}>{t.handle}</div>
                    </div>
                  </div>
                  <p className={styles.testimonialText}>"{t.text}"</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BIO ════════ */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className={styles.bioGrid}>
            <Reveal className={styles.bioText}>
              <span className={styles.sectionTag}>BEHIND THE SCENES</span>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '24px' }}>{s.bioTitle}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '16px' }}>{s.bioText1}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7 }}>{s.bioText2}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className={styles.bioImageWrap}>
                {s.bioImageUrl && <img src={s.bioImageUrl} alt={s.bioTitle} className={styles.bioImage} />}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>FAQ</span>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            </div>
          </Reveal>

          <div className={styles.faqList}>
            {s.faqs?.map((faq: any, i: number) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
                  <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <span className={styles.faqChevron}>▼</span>
                  </button>
                  <div className={styles.faqAnswer}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="section" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container">
          <Reveal>
            <div className={styles.ctaCard}>
              <div className={styles.ctaGlow} />
              <span className={styles.sectionTag}>READY TO CREATE?</span>
              <h2 className={styles.sectionTitle}>Unlock Your Full Creative Potential</h2>
              <p className={styles.sectionSubtitle} style={{ marginBottom: '32px' }}>Join hundreds of professionals who trust our premium tools.</p>
              <Link href="/products" className="btn-primary" style={{ padding: '16px 40px', fontSize: '17px', borderRadius: '14px' }}>
                Browse All Products
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
