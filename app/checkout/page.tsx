'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useStore } from '../context/StoreContext';
import { useCustomLink } from '../context/CustomLinkContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const { currency, getPrice, formatPrice } = useCurrency();
  const { products } = useStore();
  const { activeCustomLink, applyCustomPrice } = useCustomLink();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Calculate exact total based on region
  const dynamicTotal = cart.reduce((sum, item) => sum + applyCustomPrice(item.id, getPrice(item), currency), 0);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Pre-fill name if user has it
  useEffect(() => {
    if (user?.displayName) setCustomerName(user.displayName);
  }, [user]);


  const loadScript = (src: string) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!user) {
      setPaymentError("Please sign in to complete checkout.");
      return;
    }
    setLoading(true);

    try {
      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

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
      const order = await orderRes.json();
      
      if (!order || !order.id) {
        throw new Error("Could not create Razorpay order.");
      }

      // 2. Initialize Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: order.amount,
        currency: order.currency,
        name: "Crevo Store",
        description: "Premium Assets & Plugins",
        order_id: order.id,
        handler: async function (response: any) {
          setVerifying(true);
          try {
            // 3. Verify Payment and Generate Licenses
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                leadId: order.leadId
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              clearCart();
              router.push(`/success?order_id=${order.id}`);
            } else {
              setPaymentError(verifyData.error || "Payment verification failed.");
              setVerifying(false);
            }
          } catch (err: any) {
             setPaymentError("Error verifying payment.");
             setVerifying(false);
          }
        },
        prefill: {
          name: customerName,
          email: user.email,
          contact: customerPhone
        },
        theme: {
          color: "#8b5cf6"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        setPaymentError(response.error.description);
      });
      paymentObject.open();

    } catch (error: any) {
      console.error(error);
      setPaymentError(error.message || "An error occurred initializing checkout.");
    } finally {
      setLoading(false);
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
      
      {/* Verifying Payment Full Screen Overlay */}
      {verifying && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', maxWidth: '400px' }}>
            <div style={{ margin: '0 auto 24px auto', width: '48px', height: '48px', border: '4px solid rgba(139, 92, 246, 0.2)', borderTop: '4px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h2 className="h2" style={{ marginBottom: '16px' }}>Verifying Payment...</h2>
            <p className="text-secondary">Please don't close this window. We are generating your license keys.</p>
          </div>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      <div className="container section">
        <h1 className="h1" style={{ marginBottom: '48px' }}>Checkout</h1>
        <div className="md-grid-1" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '48px' }}>
          
          {/* Left Side: Order Summary */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 className="h2" style={{ marginBottom: '24px' }}>Order Summary ({cart.length} Items)</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '24px' }}>
              {cart.map((item, index) => (
                <div key={index} style={{ marginBottom: item.productIds ? '8px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 500 }}>{item.name}</h4>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.category}</span>
                    </div>
                    <span style={{ fontWeight: 500 }}>{formatPrice(applyCustomPrice(item.id, getPrice(item), currency))}</span>
                  </div>
                  {/* Display bundle sub-items */}
                  {item.productIds && item.productIds.length > 0 && (
                    <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {item.productIds.map(pid => {
                        const product = products.find(p => p.id === pid);
                        return (
                          <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              ↳ {product ? product.name : 'Included Item'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {product ? product.category : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>Total</span>
              <span className="h2 text-gradient" style={{ fontSize: '1.5rem' }}>{formatPrice(dynamicTotal)}</span>
            </div>
          </div>

          {/* Right Side: Payment Form */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 className="h2" style={{ marginBottom: '24px' }}>Payment</h2>
            
            {paymentError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#fca5a5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: 600, color: 'var(--danger)' }}>
                  ⚠️ Transaction Error
                </div>
                <div style={{ fontSize: '0.875rem' }}>{paymentError}</div>
              </div>
            )}

            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Logged in as</p>
                <p style={{ fontWeight: 500 }}>{user.email}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name *</label>
                <input type="text" className="input-field" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Phone Number *</label>
                <input type="tel" className="input-field" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 9876543210" required />
              </div>

              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Payment Method</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                  <span style={{ fontWeight: 500 }}>Razorpay (Cards, UPI, NetBanking)</span>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '16px', padding: '16px', fontSize: '1.125rem' }} disabled={loading || dynamicTotal <= 0}>
                {loading ? 'Initializing Payment...' : `Pay ${formatPrice(dynamicTotal)}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
