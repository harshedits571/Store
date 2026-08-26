'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useCustomLink } from '../context/CustomLinkContext';

/**
 * LimitedCouponPopup — High-converting, interactive countdown coupon modal
 * & docked floating pill.
 * Configured live from Admin Settings (settings/homepage doc).
 */
export default function LimitedCouponPopup() {
  const { homepageSettings: s } = useStore();
  const { applyCouponCode } = useCustomLink();

  // Settings from Firestore (with intelligent defaults)
  const isEnabled = s?.promoPopupEnabled !== false; // Default true if configured
  const badgeText = s?.promoPopupBadge || '⚡ LIMITED TIME OFFER ⚡';
  const heading   = s?.promoPopupHeading || 'Exclusive Creator Discount';
  const desc      = s?.promoPopupDesc || 'Get an instant discount on all premium video editing assets, plugins & presets before the timer expires!';
  const code      = (s?.promoPopupCode || 'CREVO20').toUpperCase();
  const discount  = s?.promoPopupDiscount || '20% OFF';
  const timerMins = parseInt(s?.promoPopupMinutes || '15', 10) || 15;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ m: number; s: number }>({ m: timerMins, s: 0 });
  const [hasDismissed, setHasDismissed] = useState(false);

  // Initialize or restore visitor's individual countdown timer in localStorage
  useEffect(() => {
    if (!isEnabled) return;

    const storageKey = `crevo_countdown_exp_${code}`;
    let expiry = localStorage.getItem(storageKey);

    if (!expiry || isNaN(parseInt(expiry, 10)) || parseInt(expiry, 10) < Date.now()) {
      // Set new expiry in future
      const newExpiry = Date.now() + timerMins * 60 * 1000;
      localStorage.setItem(storageKey, newExpiry.toString());
      expiry = newExpiry.toString();
    }

    const targetTime = parseInt(expiry, 10);

    const updateTimer = () => {
      const remaining = Math.max(0, targetTime - Date.now());
      const m = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setTimeLeft({ m, s: sec });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    // Initial popup appearance after 2.5s on first visit of session
    const shownInSession = sessionStorage.getItem('crevo_promo_popup_shown');
    if (!shownInSession) {
      const showTimer = setTimeout(() => {
        setIsOpen(true);
        setIsMinimized(false);
        sessionStorage.setItem('crevo_promo_popup_shown', 'true');
      }, 2500);
      return () => {
        clearInterval(interval);
        clearTimeout(showTimer);
      };
    } else {
      setIsMinimized(true);
    }

    return () => clearInterval(interval);
  }, [isEnabled, code, timerMins]);

  // Copy code & automatically pre-apply to session
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      // Auto-apply to custom link session
      applyCouponCode(code);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(true);
    setHasDismissed(true);
  };

  const formatNum = (n: number) => n.toString().padStart(2, '0');

  // If feature is turned off in settings, render nothing
  if (!isEnabled && !s?.promoPopupEnabled) return null;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          1. MAIN FLOATING POPUP MODAL
          ═══════════════════════════════════════════════════════ */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          {/* Backdrop click to minimize */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={handleClose} />

          {/* Modal Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            padding: '36px 32px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
          }}>
            {/* Top decorative gradient glow */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '280px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(0, 113, 227, 0.25) 0%, rgba(168, 85, 247, 0.2) 60%, transparent 80%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }} />

            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                color: '#666',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Close and minimize"
            >
              ✕
            </button>

            {/* Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.15) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#DC2626',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              marginBottom: '16px',
              textTransform: 'uppercase',
            }}>
              🔥 {badgeText}
            </div>

            {/* Heading */}
            <h3 style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#111',
              margin: '0 0 8px 0',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}>
              {heading}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              margin: '0 auto 24px auto',
              lineHeight: 1.5,
              maxWidth: '360px',
            }}>
              {desc}
            </p>

            {/* Countdown Box */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '14px',
              padding: '10px 20px',
              marginBottom: '24px',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>⏳ Offer expires in:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                <div style={{
                  background: '#111',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '1rem',
                }}>
                  {formatNum(timeLeft.m)}
                </div>
                <span style={{ fontWeight: 800, color: '#111' }}>:</span>
                <div style={{
                  background: '#111',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '1rem',
                }}>
                  {formatNum(timeLeft.s)}
                </div>
              </div>
            </div>

            {/* Coupon Code Copy Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F3F4F6',
              border: '2px dashed rgba(0, 113, 227, 0.4)',
              borderRadius: '16px',
              padding: '8px 8px 8px 18px',
              marginBottom: '16px',
            }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#0071E3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {discount} Coupon Code
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#111', letterSpacing: '1px' }}>
                  {code}
                </span>
              </div>

              <button
                onClick={handleCopyCode}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: copied
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #0071E3 0%, #005BB5 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: copied
                    ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                    : '0 4px 14px rgba(0, 113, 227, 0.35)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>

            {/* Bottom note */}
            <div style={{ fontSize: '0.75rem', color: '#888' }}>
              {copied ? '🎉 Code copied & auto-applied to your checkout!' : 'Click to copy code and apply automatically at checkout.'}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          2. DOCKED BOTTOM-RIGHT FLOATING BADGE (When Minimized)
          ═══════════════════════════════════════════════════════ */}
      {!isOpen && (
        <div
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(0, 113, 227, 0.25)',
            boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            borderRadius: '100px',
            padding: '8px 16px 8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            animation: 'slideUp 0.3s ease-out',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          title="Click to view limited-time coupon discount"
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
        >
          {/* Pulsing fire/gift icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0071E3 0%, #9333EA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.9rem',
            boxShadow: '0 2px 8px rgba(0, 113, 227, 0.4)',
          }}>
            🎁
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#111', lineHeight: 1.2 }}>
              {discount} with <span style={{ color: '#0071E3', fontFamily: 'monospace' }}>{code}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>⏱</span>
              <span>{formatNum(timeLeft.m)}:{formatNum(timeLeft.s)} left</span>
            </div>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#0071E3', fontWeight: 700, marginLeft: '4px' }}>
            Claim ➔
          </span>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
