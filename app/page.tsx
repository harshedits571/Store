'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useStore } from './context/StoreContext';
import { useCart } from './context/CartContext';
import { useCurrency } from './context/CurrencyContext';
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
  const featured = products.filter(p =>
    s.featuredProductIds?.length ? s.featuredProductIds.includes(p.id) : true
  ).slice(0, 4); // Limit to 4 for the clean grid

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
      <div className={styles.splash}>
        <div style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          Creative Store
        </div>
        <div className={styles.splashBar} />
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
            {s.heroTitleLine1 || 'WELCOME TO'}<br />
            {s.heroTitleLine2 || 'THE CREATORS'}
          </motion.h1>

          <motion.p 
            className={styles.heroSubtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {s.heroSubtitle || 'Quality resources, unique tools, and everything you need to elevate your work.'}
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

      {/* ── Floating Overlapping Info Cards ── */}
      <div className={styles.infoCardsWrap}>
        <motion.div 
          className={styles.infoCard}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className={styles.infoCardHeader}>Information</h2>
          <p className={styles.infoCardText}>
            Welcome to our page, where you are going to find all types of varied publishing, quality editions, unique classes, and many things. Join us.
          </p>
        </motion.div>

        <motion.div 
          className={styles.infoCard}
          style={{ background: 'var(--text-primary)', color: 'white' }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className={styles.infoCardHeader}>Community</h2>
          <p className={styles.infoCardText} style={{ color: 'var(--text-muted)' }}>
            Join hundreds of other professional editors who use our assets daily to speed up their workflow and deliver higher quality results.
          </p>
        </motion.div>
      </div>

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
                    </div>
                    <div className={styles.productBody}>
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
          BENTO BOX FEATURES GRID
          ════════════════════════════════════════════════════ */}
      <section className="section" style={{ padding: '80px 24px' }}>
        <div className="container">
          <Section>
            <div className={styles.sectionHeader} style={{ textAlign: 'center' }}>
              <h2 className={styles.sectionTitle}>Why Choose Us</h2>
              <p className={styles.sectionSubtitle} style={{ margin: '0 auto' }}>
                Premium quality assets designed to elevate your workflow and unlock your creative potential.
              </p>
            </div>
          </Section>

          <Section delay={0.2}>
            <div className={styles.bentoGrid}>
              <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
                <div>
                  <div className={styles.bentoIcon}>⚡️</div>
                  <h3 className={styles.bentoTitle}>Instant Delivery</h3>
                  <p className={styles.bentoText}>
                    Get immediate access to your assets the second you check out. No waiting, just creating.
                  </p>
                </div>
              </div>
              
              <div className={styles.bentoCard}>
                <div>
                  <div className={styles.bentoIcon}>💎</div>
                  <h3 className={styles.bentoTitle}>Premium Quality</h3>
                  <p className={styles.bentoText}>
                    Every asset is meticulously crafted by industry professionals.
                  </p>
                </div>
              </div>

              <div className={styles.bentoCard}>
                <div>
                  <div className={styles.bentoIcon}>🔄</div>
                  <h3 className={styles.bentoTitle}>Lifetime Updates</h3>
                  <p className={styles.bentoText}>
                    Buy once, get updates forever. It's that simple.
                  </p>
                </div>
              </div>

              <div className={`${styles.bentoCard} ${styles.bentoWide}`}>
                <div>
                  <div className={styles.bentoIcon}>🔒</div>
                  <h3 className={styles.bentoTitle}>Secure Checkout</h3>
                  <p className={styles.bentoText}>
                    Your payments are fully encrypted and securely processed. Shop with complete peace of mind.
                  </p>
                </div>
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
      <section className="section" style={{ padding: '80px 24px' }}>
        <div className="container">
          <Section>
            <div className={styles.splitBanner}>
              <div className={styles.splitBannerLeft}>
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

      {/* ════════════════════════════════════════════════════
          TESTIMONIALS (Apple Marquee)
          ════════════════════════════════════════════════════ */}
      <section className="section" style={{ padding: '60px 0', overflow: 'hidden' }}>
        <Section>
          <div className={styles.sectionHeader} style={{ textAlign: 'center' }}>
            <h2 className={styles.sectionTitle}>Loved by Creators</h2>
          </div>
        </Section>
        
        <div className={styles.testimonialsWrap}>
          <div className={styles.testimonialsTrack}>
            {[
              { text: "These assets completely transformed my workflow. The quality is unmatched and it saves me hours of time on every project.", author: "Alex R.", role: "Video Editor" },
              { text: "I've purchased many bundles before, but this one is actually worth every penny. The glassmorphism UI kit is gorgeous.", author: "Sarah M.", role: "Product Designer" },
              { text: "Instant delivery and everything just works out of the box. Customer support was also incredibly helpful when I had a question.", author: "David K.", role: "Freelancer" },
              { text: "These assets completely transformed my workflow. The quality is unmatched and it saves me hours of time on every project.", author: "Alex R.", role: "Video Editor" },
              { text: "I've purchased many bundles before, but this one is actually worth every penny. The glassmorphism UI kit is gorgeous.", author: "Sarah M.", role: "Product Designer" },
              { text: "Instant delivery and everything just works out of the box. Customer support was also incredibly helpful when I had a question.", author: "David K.", role: "Freelancer" }
            ].map((t, i) => (
              <div key={i} className={styles.testimonialCard}>
                <div className={styles.testimonialStars}>★★★★★</div>
                <p className={styles.testimonialText}>"{t.text}"</p>
                <div className={styles.testimonialAuthor}>{t.author} • {t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FAQ
          ════════════════════════════════════════════════════ */}
      <section className="section" style={{ padding: '80px 24px', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <Section>
            <div className={styles.sectionHeader} style={{ textAlign: 'center', marginBottom: '60px' }}>
              <h2 className={styles.sectionTitle}>Questions?</h2>
              <p className={styles.sectionSubtitle} style={{ margin: '0 auto' }}>Everything you need to know about our products and billing.</p>
            </div>
          </Section>

          <div className={styles.faqList}>
            {[
              { q: 'How do I get access after purchasing?', a: 'Immediately after a successful payment, you will be redirected to a success page where you can copy your license keys. We also email you a backup link instantly.' },
              { q: 'Can I use these assets for commercial projects?', a: 'Yes! All of our premium products come with a commercial license allowing you to use them in client work and monetized projects.' },
              { q: 'Do you offer refunds?', a: 'Due to the digital nature of our products, all sales are final. If you have technical issues, our support team will help you resolve them within 24 hours.' },
              { q: 'Are lifetime updates really forever?', a: 'Yes. If you purchase the bundle or a product that includes lifetime updates, you will never be charged for future versions of that product.' }
            ].map((faq, i) => (
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

    </div>
  );
}
