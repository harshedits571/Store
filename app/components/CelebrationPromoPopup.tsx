'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function CelebrationPromoPopup() {
  const { homepageSettings: s, initialLoading } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check if special promo is enabled — fires EVERY page load when active
  useEffect(() => {
    if (initialLoading) return;
    if (!s?.specialPromoEnabled) return;

    // Always show on page load when special day is active (no session gate)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [initialLoading, s?.specialPromoEnabled, s?.specialPromoCode]);

  // Launch Full-Screen Confetti Cannon when popup opens
  useEffect(() => {
    if (!isOpen || !s?.specialPromoConfetti) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      vx: number;
      vy: number;
      rot: number;
      vRot: number;
      opacity: number;
      shape: 'rect' | 'circle' | 'star';
    }

    const colors = ['#FFD700', '#FF3B30', '#34C759', '#007AFF', '#AF52DE', '#FF9500', '#FF2D55', '#5856D6'];
    const particles: Particle[] = [];

    // Left cannon
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: 0,
        y: canvas.height * 0.75,
        w: Math.random() * 10 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 14 + 10,
        vy: -(Math.random() * 18 + 12),
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: Math.random() > 0.3 ? 'rect' : 'circle'
      });
    }

    // Right cannon
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width,
        y: canvas.height * 0.75,
        w: Math.random() * 10 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: -(Math.random() * 14 + 10),
        vy: -(Math.random() * 18 + 12),
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: Math.random() > 0.3 ? 'rect' : 'circle'
      });
    }

    // Center ceiling shower
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20,
        w: Math.random() * 8 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: 'rect'
      });
    }

    let animId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // Gravity
        p.vx *= 0.985; // Air friction
        p.rot += p.vRot;

        if (p.y > canvas.height * 0.6) {
          p.opacity -= 0.012;
        }

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, s?.specialPromoConfetti]);

  const handleApplyDiscount = () => {
    const code = (s.specialPromoCode || 'SPECIAL50').trim().toUpperCase();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('custom_link_ref', code);
    }
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!s?.specialPromoEnabled) return null;

  return (
    <>
      {/* Fullscreen Confetti Canvas */}
      {isOpen && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 999998
          }}
        />
      )}

      {/* Celebration Glass Modal */}
      <AnimatePresence>
        {isOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 999999
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                background: '#ffffff',
                borderRadius: '28px',
                padding: '36px 32px 30px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top ambient color bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: 'linear-gradient(90deg, #FF3B30, #FF9500, #FFCC00, #34C759, #007AFF, #AF52DE)'
              }} />

              {/* Close Button */}
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6B7280',
                  fontSize: '1rem',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>

              {/* Celebration Emblem */}
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                border: '2px solid #FECDD3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(244, 63, 94, 0.18)'
              }}>
                🎉
              </div>

              {/* Occasion Badge */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(244, 63, 94, 0.1)',
                color: '#E11D48',
                padding: '4px 14px',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}>
                {s.specialPromoOccasion || '🎂 Special Celebration Day!'}
              </div>

              {/* Headline */}
              <h2 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#111827',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}>
                {s.specialPromoHeading || 'Special Discount Unlocked!'}
              </h2>

              {/* Reason description */}
              <p style={{
                fontSize: '0.88rem',
                color: '#4B5563',
                lineHeight: 1.55,
                margin: '0 0 22px 0'
              }}>
                {s.specialPromoReason || 'Today is a very special day for us! We are celebrating with an exclusive store-wide discount for our creative community.'}
              </p>

              {/* Coupon Claim Box */}
              <div style={{
                background: '#F9FAFB',
                border: '2px dashed #D1D5DB',
                borderRadius: '16px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Special Promo Code
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', letterSpacing: '0.08em' }}>
                    {s.specialPromoCode || 'SPECIAL50'}
                  </div>
                </div>

                <div style={{
                  background: '#10B981',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {s.specialPromoDiscount || '50% OFF'}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleApplyDiscount}
                style={{
                  width: '100%',
                  background: copied ? '#10B981' : '#111827',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {copied ? '✓ Code Copied & Applied to Checkout!' : '🎁 Copy & Apply Discount'}
              </button>

              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginTop: '12px',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Continue Shopping
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
