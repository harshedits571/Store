'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GlobalLoader — Pristine Apple-White Luxury Preloader
 * - Luminous clean white backdrop with subtle ethereal pastel aura
 * - Frosted glass squircle brand emblem with glossy light sweep
 * - Crisp typography, live precision progress bar, and real-time status ticker
 * - Butter-smooth fade-out transition
 */
export default function GlobalLoader() {
  const [show, setShow] = useState(true);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 1100; // 1.1s snappy & smooth

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setPercent(progress);

      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => {
          setShow(false);
        }, 160);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const getStatusText = (p: number) => {
    if (p < 30) return 'INITIALIZING STUDIO ENGINE...';
    if (p < 70) return 'LOADING ASSETS & EXTENSIONS...';
    if (p < 95) return 'OPTIMIZING EXPERIENCE...';
    return 'READY ✨';
  };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="global-loader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.02,
            filter: 'blur(6px)',
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(ellipse at center, #FFFFFF 0%, #F8FAFC 100%)',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ethereal Ambient Glows */}
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '35%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 113, 227, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            animation: 'ambientFloat 4s ease-in-out infinite alternate',
          }} />

          <div style={{
            position: 'absolute',
            bottom: '25%',
            right: '35%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.07) 0%, rgba(236, 72, 153, 0.03) 50%, transparent 70%)',
            filter: 'blur(55px)',
            pointerEvents: 'none',
            animation: 'ambientFloat 5s ease-in-out infinite alternate-reverse',
          }} />

          {/* Center Brand Architecture */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 24px',
          }}>

            {/* Glowing Apple Glass Emblem */}
            <div style={{
              position: 'relative',
              marginBottom: '28px',
            }}>
              {/* Outer Glow Ring */}
              <div style={{
                position: 'absolute',
                inset: '-3px',
                borderRadius: '26px',
                background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.25), rgba(168, 85, 247, 0.2))',
                filter: 'blur(10px)',
                opacity: 0.7,
              }} />

              {/* Glass Squircle */}
              <div style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                borderRadius: '22px',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 20px 40px -12px rgba(0, 113, 227, 0.16), 0 4px 12px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {/* Light Sweep Sheen */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(0, 113, 227, 0.12), transparent)',
                  animation: 'shimmerSweep 2.2s infinite',
                }} />

                <img
                  src="/fabicone.png"
                  alt="Crevo"
                  style={{
                    width: '44px',
                    height: '44px',
                    objectFit: 'contain',
                    borderRadius: '10px',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Title with Crisp Typography */}
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#0F172A',
              marginBottom: '8px',
            }}>
              CREVO STORE
            </div>

            {/* Micro Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '100px',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              marginBottom: '32px',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
              }} />
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: '#64748B',
                textTransform: 'uppercase',
              }}>
                Creative Engine v2.1
              </span>
            </div>

            {/* Precision Gradient Progress Track */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              width: '230px',
            }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(0, 0, 0, 0.06)',
                borderRadius: '100px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: 'linear-gradient(90deg, #0071E3 0%, #6366F1 50%, #A855F7 100%)',
                    borderRadius: '100px',
                    boxShadow: '0 0 10px rgba(0, 113, 227, 0.5)',
                    transition: 'width 0.03s linear',
                  }}
                />
              </div>

              {/* Status Ticker & Percentage */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}>
                  {getStatusText(percent)}
                </span>

                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: '#0F172A',
                  letterSpacing: '0.05em',
                  marginLeft: '8px',
                }}>
                  {percent}%
                </span>
              </div>
            </div>

          </div>

          <style jsx global>{`
            @keyframes shimmerSweep {
              0% { left: -100%; }
              50%, 100% { left: 200%; }
            }
            @keyframes ambientFloat {
              0% { transform: scale(0.95) translate(-6px, -6px); opacity: 0.7; }
              100% { transform: scale(1.05) translate(6px, 6px); opacity: 1; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
