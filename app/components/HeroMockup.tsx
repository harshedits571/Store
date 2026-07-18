'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../page.module.css';

const SLIDES = [
  {
    badge: 'Pro Creator Suite',
    title: 'Unleash Your\nCreativity',
    desc: 'Ultra-premium digital assets, engineered for professionals who demand the best.'
  },
  {
    badge: 'Advanced Workflow',
    title: 'Accelerate\nProduction',
    desc: 'Save hundreds of hours with our instantly applicable drag-and-drop presets.'
  },
  {
    badge: 'Masterclass Series',
    title: 'Master Your\nCraft',
    desc: 'Learn the exact techniques used by industry leaders and top creators.'
  }
];

export default function HeroMockup() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className={styles.heroMockupWrap}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.heroMockupInner}>
        <div className={styles.mockupHeader}>
          <span className={styles.mockupDot} style={{ background: '#ff5f56' }} />
          <span className={styles.mockupDot} style={{ background: '#ffbd2e' }} />
          <span className={styles.mockupDot} style={{ background: '#27c93f' }} />
        </div>
        <div className={styles.mockupBody} style={{ position: 'relative', overflow: 'hidden', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div className={styles.mockupGrid} />
          
          {/* Background glowing orbs */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', top: '10%', left: '20%' }}
          />
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ position: 'absolute', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', bottom: '10%', right: '20%' }}
          />

          {/* LEFT SIDE FLOATING ELEMENTS */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', top: '20%', left: '10%', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>VFX Bundle</span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ position: 'absolute', bottom: '30%', left: '12%', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>SFX Library</span>
          </motion.div>

          <motion.div
            animate={{ x: [0, -10, 0], y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ position: 'absolute', top: '45%', left: '6%', width: '40px', height: '40px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(236,72,153,0.3)', opacity: 0.8 }}
          >
            <span style={{ color: 'white', fontSize: '1rem' }}>🎵</span>
          </motion.div>

          {/* RIGHT SIDE FLOATING ELEMENTS */}
          <motion.div
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            style={{ position: 'absolute', bottom: '25%', right: '12%', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>LUTS Pack</span>
          </motion.div>
          
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            style={{ position: 'absolute', top: '25%', right: '15%', background: 'var(--bg-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{ width: '8px', height: '8px', background: '#8b5cf6', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Transitions</span>
          </motion.div>

          <motion.div
            animate={{ x: [0, 10, 0], y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            style={{ position: 'absolute', top: '50%', right: '8%', width: '48px', height: '48px', background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(59,130,246,0.3)', opacity: 0.8 }}
          >
            <span style={{ color: 'white', fontSize: '1.25rem' }}>✨</span>
          </motion.div>

          {/* Central Glassmorphism Card */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-glass)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '500px'
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8), transparent)' }} />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ 
                  display: 'inline-block', 
                  background: 'rgba(59,130,246,0.1)', 
                  border: '1px solid rgba(59,130,246,0.2)', 
                  padding: '6px 16px', 
                  borderRadius: '100px', 
                  color: '#60a5fa', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  letterSpacing: '1px', 
                  textTransform: 'uppercase', 
                  marginBottom: '24px' 
                }}>
                  {SLIDES[activeSlide].badge}
                </div>
                
                <h3 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 800, 
                  marginBottom: '16px',
                  lineHeight: '1.2',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line'
                }}>
                  {SLIDES[activeSlide].title}
                </h3>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '300px', margin: '0 auto', lineHeight: '1.6', minHeight: '60px' }}>
                  {SLIDES[activeSlide].desc}
                </p>
              </motion.div>
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
              {SLIDES.map((_, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  style={{ 
                    width: activeSlide === idx ? '40px' : '16px', 
                    height: '4px', 
                    background: activeSlide === idx ? '#3b82f6' : 'var(--border-subtle)', 
                    borderRadius: '2px', 
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
