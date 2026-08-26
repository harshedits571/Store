'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useStore } from '../context/StoreContext';
import { useCustomLink } from '../context/CustomLinkContext';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', name: 'United States (+1)' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom (+44)' },
  { code: '+971', flag: '🇦🇪', name: 'UAE (+971)' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia (+966)' },
  { code: '+1', flag: '🇨🇦', name: 'Canada (+1)' },
  { code: '+61', flag: '🇦🇺', name: 'Australia (+61)' },
  { code: '+49', flag: '🇩🇪', name: 'Germany (+49)' },
  { code: '+33', flag: '🇫🇷', name: 'France (+33)' },
  { code: '+81', flag: '🇯🇵', name: 'Japan (+81)' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore (+65)' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh (+880)' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan (+92)' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal (+977)' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil (+55)' },
  { code: '+39', flag: '🇮🇹', name: 'Italy (+39)' },
  { code: '+34', flag: '🇪🇸', name: 'Spain (+34)' },
  { code: '+7', flag: '🇷🇺', name: 'Russia (+7)' },
  { code: '+86', flag: '🇨🇳', name: 'China (+86)' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea (+82)' },
  { code: '+62', flag: '🇮🇩', name: 'Indonesia (+62)' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia (+60)' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines (+63)' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey (+90)' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa (+27)' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt (+20)' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria (+234)' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico (+52)' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands (+31)' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland (+41)' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden (+46)' },
  { code: '+47', flag: '🇳🇴', name: 'Norway (+47)' },
  { code: '+45', flag: '🇩🇰', name: 'Denmark (+45)' },
  { code: '+358', flag: '🇫🇮', name: 'Finland (+358)' },
  { code: '+48', flag: '🇵🇱', name: 'Poland (+48)' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal (+351)' },
  { code: '+30', flag: '🇬🇷', name: 'Greece (+30)' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand (+64)' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka (+94)' },
  { code: '+968', flag: '🇴🇲', name: 'Oman (+968)' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar (+974)' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait (+965)' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain (+973)' }
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const { currency, getPrice, formatPrice } = useCurrency();
  const { homepageSettings: s, products } = useStore();
  const { activeCustomLink, applyCustomPrice, applyCouponCode, removeCouponCode } = useCustomLink();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Calculate exact total based on region
  const dynamicTotal = cart.reduce((sum, item) => sum + applyCustomPrice(item.id, getPrice(item), currency), 0);
  const subTotal = cart.reduce((sum, item) => sum + getPrice(item), 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    const res = await applyCouponCode(couponCode);
    if (!res.success) {
      setCouponError(res.error || 'Invalid coupon code.');
    } else {
      setCouponCode('');
    }
    setApplyingCoupon(false);
  };

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const customerPhone = phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : '';

  // Pre-fill name if user has it
  useEffect(() => {
    if (user?.displayName) setCustomerName(user.displayName);
  }, [user]);


  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!user) {
      setPaymentError("Please sign in to complete checkout.");
      return;
    }
    setLoading(true);

    try {
      // --- Handle Free Checkout ---
      if (dynamicTotal === 0) {
        setVerifying(true);
        const freeRes = await fetch('/api/claim-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: user.email,
            name: customerName,
            phone: customerPhone,
            cart: cart,
            currency,
            customLinkCode: activeCustomLink?.id || null
          })
        });
        
        const freeData = await freeRes.json();
        if (freeData.success) {
          clearCart();
          router.push(`/success?orderId=${freeData.orderId}`);
        } else {
          setPaymentError("Failed to claim free items: " + freeData.error);
          setLoading(false);
          setVerifying(false);
        }
        return; // Exit here, do not run Razorpay
      }

      // Check if there are any subscription items in the cart
      const subscriptionItems = cart.filter(item => item.isSubscription);
      const isSubscriptionCheckout = subscriptionItems.length > 0;

      if (isSubscriptionCheckout && cart.length > 1) {
        setPaymentError("You cannot mix subscription products with other items in the same checkout. Please purchase them separately.");
        setLoading(false);
        return;
      }

      let order: any = null;
      let subscriptionData: any = null;

      if (isSubscriptionCheckout) {
        // --- Handle Subscription Checkout ---
        const subItem = subscriptionItems[0];
        
        const subRes = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             email: user.email,
             name: customerName,
             phone: customerPhone,
             planId: subItem.planId,
             productId: subItem.id,
             amount: dynamicTotal,
             currency,
             customLinkCode: activeCustomLink?.id || null
          })
        });
        subscriptionData = await subRes.json();
        
        if (!subscriptionData || !subscriptionData.subscription_id) {
           throw new Error(subscriptionData.error || "Could not create Razorpay subscription.");
        }
      } else {
        // --- Handle Paid Order Checkout ---
        // 1. Create order on our backend and save lead as 'interested'
        const orderRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: dynamicTotal, 
            currency,
            email: user.email,
            name: customerName,
            phone: customerPhone,
            cart: cart,
            customLinkCode: activeCustomLink?.id || null
          })
        });
        order = await orderRes.json();
        
        if (!order || !order.id) {
          throw new Error(order.error || "Could not create Razorpay order.");
        }
      }

      // 2. Initialize Razorpay Checkout
      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Enter the Key ID generated from the Dashboard
        name: s.heroTitleLine1 || "Crevo Store",
        description: isSubscriptionCheckout ? "Premium Subscription" : "Premium Assets",
        handler: async function (response: any) {
          try {
            setVerifying(true);
            const verifyRes = await fetch('/api/generate-license', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                leadRefId: isSubscriptionCheckout ? subscriptionData.leadId : order.leadId,
                email: user.email,
                name: customerName,
                cart: cart,
                amount: dynamicTotal,
                currency: currency,
                customLinkCode: activeCustomLink?.id || null,
                isSubscription: isSubscriptionCheckout
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              clearCart();
              router.push(`/success?orderId=${verifyData.orderId}`);
            } else {
              setPaymentError("Payment verified, but failed to generate license: " + verifyData.error);
            }
          } catch (e: any) {
            setPaymentError("Error during license generation. Please contact support.");
          } finally {
            setVerifying(false);
          }
        },
        prefill: {
          name: customerName,
          email: user.email,
          contact: customerPhone
        },
        theme: {
          color: "#7a5af8" // var(--accent-primary)
        }
      };

      if (isSubscriptionCheckout) {
        options.subscription_id = subscriptionData.subscription_id;
      } else {
        options.order_id = order.id;
        options.amount = order.amount;
        options.currency = order.currency;
      }

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        setPaymentError(`Payment failed: ${response.error.description}`);
      });
      rzp1.open();

    } catch (err: any) {
      setPaymentError(err.message || "An error occurred during checkout.");
    } finally {  setLoading(false);
    }
  };

  if (authLoading) return null;

  if (cart.length === 0 && !verifying) {
    return (
      <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 className="h2 mb-4">Your Cart is Empty</h2>
        <button onClick={() => router.push('/products')} className="btn-primary">Browse Products</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', maxWidth: '400px' }}>
          <h2 className="h2" style={{ marginBottom: '16px' }}>Sign In Required</h2>
          <p className="text-secondary" style={{ marginBottom: '32px' }}>You must sign in to your customer account to purchase and manage your licenses.</p>
          <button onClick={signInWithGoogle} className="btn-primary" style={{ width: '100%', padding: '16px' }}>
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Verifying Payment Full Screen Luxury Overlay (White / Light Theme) */}
      {verifying && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px'
        }}>
          {/* Subtle Ambient Ethereal Glow */}
          <div style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(122, 90, 248, 0.12) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none'
          }} />

          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.14), 0 10px 30px rgba(122, 90, 248, 0.08)',
            borderRadius: '28px',
            padding: '44px 36px',
            textAlign: 'center',
            overflow: 'hidden'
          }}>
            {/* Top Luxury Gradient Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #3b82f6, #7a5af8, #10b981, #7a5af8, #3b82f6)',
              backgroundSize: '200% 100%',
              animation: 'gradientMove 2s linear infinite'
            }} />

            {/* Futuristic Orbital Ring Loader */}
            <div style={{ position: 'relative', width: '88px', height: '88px', margin: '0 auto 28px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Outer pulsing ring */}
              <div style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '2px dashed rgba(122, 90, 248, 0.25)',
                animation: 'spinReverse 8s linear infinite'
              }} />

              {/* Glowing gradient spinning ring */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#7a5af8',
                borderRightColor: '#3b82f6',
                borderBottomColor: '#10b981',
                animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
              }} />

              {/* Center icon squircle */}
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(122, 90, 248, 0.08), rgba(59, 130, 246, 0.06))',
                border: '1px solid rgba(122, 90, 248, 0.15)',
                boxShadow: '0 4px 12px rgba(122, 90, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7a5af8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            </div>

            {/* Heading & Status */}
            <h2 style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0F172A',
              marginBottom: '10px',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Verifying Payment...
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: '#64748B',
              lineHeight: 1.5,
              marginBottom: '28px',
              maxWidth: '360px',
              margin: '0 auto 28px auto'
            }}>
              Please don't close or refresh this window. We are generating your license keys and download access.
            </p>

            {/* Live Progress Indicator */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '14px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 8px #10B981',
                  animation: 'pulseDot 1.5s ease-in-out infinite'
                }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', letterSpacing: '0.02em' }}>
                  Securing License Key
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#7a5af8', fontWeight: 700, fontFamily: 'monospace' }}>
                PROCESSING
              </span>
            </div>

            {/* Security Badge Footer */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>256-Bit SSL Encrypted & Direct Instant Access</span>
            </div>
          </div>

          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes spinReverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
            @keyframes gradientMove { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
            @keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
          `}</style>
        </div>
      )}

      <div className="container section">
        <form onSubmit={handleCheckout} className="md-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '64px', alignItems: 'start' }}>
          
          {/* Left Side: Forms */}
          <div>
            <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', textDecoration: 'none', marginBottom: '24px', fontSize: '0.875rem', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Continue shopping
            </Link>
            
            <h1 className="h1" style={{ marginBottom: '8px', fontSize: '2.5rem' }}>Checkout</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '48px' }}>Complete your purchase securely.</p>

            {paymentError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: 600, color: 'var(--danger)' }}>
                  ⚠️ Transaction Error
                </div>
                <div style={{ fontSize: '0.875rem' }}>{paymentError}</div>
              </div>
            )}

            <div style={{ marginBottom: '48px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '50%', fontSize: '0.875rem' }}>1</span> 
                Contact information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Full Name</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0 16px', transition: 'border-color 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <input 
                      type="text" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)} 
                      placeholder="John Doe" 
                      required 
                      style={{ background: 'transparent', border: 'none', padding: '14px 16px', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Phone Number</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0 12px', gap: '6px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    
                    {/* Country Code Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <select 
                        value={countryCode} 
                        onChange={e => setCountryCode(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.92rem',
                          outline: 'none',
                          cursor: 'pointer',
                          padding: '14px 2px 14px 4px',
                          appearance: 'none',
                          WebkitAppearance: 'none'
                        }}
                      >
                        {COUNTRY_CODES.map((c, i) => (
                          <option key={`${c.code}-${c.name}-${i}`} value={c.code} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-2px', pointerEvents: 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', margin: '0 4px', flexShrink: 0 }} />

                    {/* Phone Number Input */}
                    <input 
                      type="tel" 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value)} 
                      placeholder="98765 43210" 
                      required 
                      style={{ background: 'transparent', border: 'none', padding: '14px 8px', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0 16px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <input 
                      type="email" 
                      value={user.email || ''} 
                      disabled 
                      style={{ background: 'transparent', border: 'none', padding: '14px 16px', color: 'var(--text-muted)', outline: 'none', fontSize: '1rem', width: '100%', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '50%', fontSize: '0.875rem' }}>2</span> 
                Payment method
              </h3>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ 
                  background: 'var(--accent-primary)', 
                  color: '#fff', 
                  padding: '14px 28px', 
                  borderRadius: '12px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(122, 90, 248, 0.4)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  {dynamicTotal === 0 ? 'Free Checkout' : 'Razorpay Secure'}
                </div>
                {/* Visual mock options for premium feel, unclickable */}
                <div style={{ 
                  background: 'transparent', 
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', 
                  padding: '14px 28px', 
                  borderRadius: '12px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  Crypto
                </div>
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Secure 256-bit SSL encryption.
              </div>
            </div>

          </div>

          {/* Right Side: Order Summary & Pay */}
          <div style={{ background: 'var(--bg-secondary)', padding: 'clamp(20px, 4vw, 36px)', borderRadius: '24px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Subtle glow in top right */}
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--accent-primary)', opacity: 0.06, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }}></div>

            {/* CSS Credit Card Graphic */}
            <div style={{ 
              width: '100%', 
              minHeight: '190px',
              height: 'clamp(190px, 42vw, 210px)', 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderRadius: '20px',
              padding: 'clamp(18px, 4vw, 24px) clamp(18px, 4vw, 28px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              marginBottom: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {/* Holographic reflection effect */}
              <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)', zIndex: 1, pointerEvents: 'none', transform: 'rotate(15deg)' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                <div style={{ width: '48px', height: '32px', background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)', borderRadius: '6px', opacity: 0.95 }}></div>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              </div>
              
              <div style={{ zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#fff' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '2px' }}>{s?.heroTitleLine1 || 'CREVO STORE'}</div>
                  <div style={{ fontSize: '1.3rem', letterSpacing: '3px', fontFamily: 'monospace', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>**** **** **** {phoneNumber ? phoneNumber.slice(-4) : '8953'}</div>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>{customerName || 'Customer'}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '28px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{cart.length} items</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {cart.map((item, index) => {
                const product = products.find(p => p.id === item.id);
                const thumb = product?.imageUrls?.[0] || product?.imageUrl || null;
                
                return (
                  <div key={index} style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--bg-primary)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-subtle)' }}>
                      {thumb ? (
                        <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '3px', lineHeight: 1.3 }}>{item.name}</h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {item.versionName && <span style={{ marginRight: '6px', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>{item.versionName}</span>}
                        {item.isSubscription && <span style={{ color: '#0071E3', background: 'rgba(0, 113, 227, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>Recurring</span>}
                      </div>
                    </div>
                    
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{formatPrice(applyCustomPrice(item.id, getPrice(item), currency))}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(subTotal)}</span>
              </div>
              
              {activeCustomLink ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontSize: '0.95rem', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    Discount ({activeCustomLink.id}) 
                    <span onClick={removeCouponCode} style={{ color: 'var(--danger)', cursor: 'pointer', marginLeft: '4px', fontSize: '0.78rem', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>Remove</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>- {formatPrice(subTotal - dynamicTotal)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0 12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    <input 
                      type="text" 
                      placeholder="COUPON CODE" 
                      value={couponCode} 
                      onChange={e => setCouponCode(e.target.value)}
                      style={{ background: 'transparent', border: 'none', padding: '12px 10px', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600, outline: 'none', width: '100%', textTransform: 'uppercase' }}
                    />
                  </div>
                  <button type="button" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()} style={{ background: '#111827', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Apply</button>
                </div>
              )}
              {couponError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{couponError}</div>}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.95rem', alignItems: 'center' }}>
                <span>Delivery Service</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 500 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Instant Delivery</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', background: 'var(--bg-primary)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Total to pay</span>
              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatPrice(dynamicTotal)}</span>
            </div>

            <button type="submit" style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff', padding: '18px', borderRadius: '16px', fontSize: '1.15rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px var(--accent-glow)', transition: 'all 0.2s ease' }} disabled={loading}>
              {loading ? (
                <span>Processing secure payment...</span>
              ) : (
                <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  {dynamicTotal === 0 ? 'Claim for Free' : `Pay ${formatPrice(dynamicTotal)}`}
                </>
              )}
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '18px', marginTop: '24px', opacity: 0.7 }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" style={{ height: '18px' }} />
              <img src="/Visa.webp" alt="Visa" style={{ height: '18px' }} />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" style={{ height: '18px' }} />
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
