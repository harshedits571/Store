'use client';

export default function PaymentTrustBadges() {
  return (
    <div style={{
      padding: '20px 18px',
      borderRadius: '20px',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      textAlign: 'center',
      marginTop: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#10B981',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span style={{ color: 'var(--text-secondary)' }}>GUARANTEED SAFE & SECURE CHECKOUT</span>
      </div>

      {/* 2-Row 4-Column Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* 1. VISA */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <svg viewBox="0 0 60 20" style={{ width: '48px', height: '18px' }} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.1 0.5L15.1 19.5H10.1L6.1 4.7C5.9 3.8 5.7 3.5 4.9 3.1C3.7 2.4 1.7 1.8 0 1.4L0.1 0.5H8.4C9.5 0.5 10.4 1.2 10.7 2.5L12.7 13.5L17.8 0.5H23.1ZM43.4 13.3C43.4 8.2 36.3 8 36.4 5.7C36.4 5 37.1 4.3 38.5 4.1C39.2 4 41.2 3.9 43.4 5L44.2 1C43 0.5 41.5 0.1 39.6 0.1C34.7 0.1 31.2 2.7 31.2 6.5C31.2 9.3 33.7 10.9 35.6 11.8C37.5 12.8 38.2 13.4 38.2 14.2C38.2 15.5 36.6 16.1 35.2 16.1C32.7 16.1 31.2 15.4 30.1 14.8L29.2 19.1C30.4 19.6 32.6 20.1 34.8 20.1C40.1 20.1 43.4 17.5 43.4 13.3ZM56.3 19.5H60.8L56.9 0.5H52.7C51.8 0.5 51 1 50.6 1.9L43.2 19.5H48.4L49.4 16.6H55.7L56.3 19.5ZM50.8 12.6L53.4 5.3L54.8 12.6H50.8ZM30.7 0.5L26.6 19.5H21.7L25.8 0.5H30.7Z" fill="#1434CB"/>
          </svg>
        </div>

        {/* 2. Mastercard */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <svg viewBox="0 0 38 24" style={{ width: '38px', height: '24px' }} xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#EB001B"/>
            <circle cx="26" cy="12" r="12" fill="#F79E1B"/>
            <path d="M19 3.75A12 12 0 0 0 12 12a12 12 0 0 0 7 8.25A12 12 0 0 0 26 12a12 12 0 0 0-7-8.25z" fill="#FF5F00"/>
          </svg>
        </div>

        {/* 3. AMEX */}
        <div style={{
          background: '#006FCF',
          border: '1px solid #0058A6',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <span style={{
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            AMEX
          </span>
        </div>

        {/* 4. Apple Pay */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <svg viewBox="0 0 46 20" style={{ width: '44px', height: '18px' }} fill="#000" xmlns="http://www.w3.org/2000/svg">
            {/* Apple */}
            <path d="M4.6 4.2c.5-.7.9-1.6.8-2.6-.9.1-1.9.6-2.5 1.3-.5.6-1 1.5-.8 2.5 1 0 1.9-.5 2.5-1.2zm.8 1.3c-1.3 0-2.4.8-3 .8-.7 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1 8.5.7 1 1.6 2.2 2.6 2.1 1 0 1.5-.7 2.7-.7 1.3 0 1.6.7 2.7.7 1.1 0 1.9-1 2.6-2.1.8-1.2 1.1-2.3 1.1-2.4 0-.1-2.2-.9-2.2-3.4 0-2.1 1.7-3.2 1.8-3.3-1-1.5-2.6-1.6-3.2-1.7z" transform="translate(4.5, 0.5)"/>
            {/* Pay */}
            <text x="19" y="14.5" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" fontSize="12" fontWeight="600" fill="#000000">Pay</text>
          </svg>
        </div>

        {/* 5. PayPal */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <svg viewBox="0 0 54 18" style={{ width: '50px', height: '18px' }} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.6 0.8H1.4C1.1 0.8 0.9 1 0.8 1.3L0 12.8C0 13 0.2 13.2 0.4 13.2H2.2C2.4 13.2 2.6 13 2.7 12.8L3.2 8.9C3.2 8.7 3.4 8.5 3.6 8.5H4.5C6.9 8.5 8.7 7.5 9.2 4.7C9.5 3.4 9.2 2.4 8.5 1.7C7.7 1 6.5 0.8 4.6 0.8Z" fill="#003087"/>
            <path d="M9.2 4.7C8.9 6 8.1 7 6.9 7.6C6.1 8 5.3 8.2 4.4 8.2H3.5C3.3 8.2 3.1 8.4 3.1 8.6L2.5 12.4C2.4 12.6 2.6 12.8 2.8 12.8H4.4C4.6 12.8 4.8 12.6 4.9 12.4L5.3 9.3C5.3 9.1 5.5 8.9 5.7 8.9H6.3C8.5 8.9 10.2 8 10.7 5.5C10.9 4.4 10.7 3.5 10.1 2.9C9.7 3.6 9.4 4.2 9.2 4.7Z" fill="#0079C1"/>
            <text x="13.5" y="13.5" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11.5" fontWeight="800" fontStyle="italic" fill="#003087">Pay</text>
            <text x="32" y="13.5" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11.5" fontWeight="800" fontStyle="italic" fill="#0079C1">Pal</text>
          </svg>
        </div>

        {/* 6. Google Pay (Clean Pro Vector) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Google G logo */}
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span style={{
              color: '#3c4043',
              fontWeight: 700,
              fontSize: '0.82rem',
              fontFamily: 'system-ui, -apple-system, Roboto, sans-serif',
              letterSpacing: '-0.02em'
            }}>
              Pay
            </span>
          </div>
        </div>

        {/* 7. PhonePe */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#5f259f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '0.65rem'
            }}>
              पे
            </div>
            <span style={{
              color: '#5f259f',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '-0.02em'
            }}>
              PhonePe
            </span>
          </div>
        </div>

        {/* 8. UPI */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }} fill="none">
              <path d="M5 4l7 8-7 8" stroke="#097939" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4l7 8-7 8" stroke="#ED752E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{
              fontWeight: 800,
              fontSize: '0.76rem',
              color: '#111827',
              letterSpacing: '0.04em'
            }}>
              UPI
            </span>
          </div>
        </div>
      </div>

      {/* Trust Subtext Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '16px',
        fontSize: '0.73rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap'
      }}>
        <span>🔒 256-Bit Bank-Grade SSL</span>
        <span>•</span>
        <span>Global & Domestic Cards</span>
        <span>•</span>
        <span>Instant DRM Key</span>
      </div>
    </div>
  );
}
