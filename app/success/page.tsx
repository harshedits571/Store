'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../context/AuthContext';
import QuickReview from '../components/QuickReview';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { user } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [orderLicenses, setOrderLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch Products catalog for real download links and thumbnails
        const prodSnap = await getDocs(collection(db, 'products'));
        const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllProducts(prods);

        // 2. Fetch Order from leads collection
        const orderSnap = await getDoc(doc(db, 'leads', orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          setOrder(orderData);

          // 3. Fetch ONLY the licenses belonging to THIS specific order
          const qOrder = query(
            collection(db, 'licenses'),
            where('orderId', '==', orderId)
          );
          const licSnap = await getDocs(qOrder);
          
          if (!licSnap.empty) {
            setOrderLicenses(licSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        }
      } catch (err) {
        console.error('Error fetching success details:', err);
      }
      setLoading(false);
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 18px auto',
          borderRadius: '50%',
          border: '3px solid rgba(0, 113, 227, 0.2)',
          borderTopColor: '#0071E3',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>Loading your order details...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Check if order is genuinely verified & paid
  const isOrderVerified = (orderData: any) => {
    if (!orderData) return false;
    const status = (orderData.status || '').toLowerCase();
    const isVerifiedStatus = status === 'verified' || status === 'completed' || status === 'success';
    const amount = Number(orderData.amount || 0);
    if (amount === 0) return isVerifiedStatus;
    return isVerifiedStatus && (!!orderData.paymentId || !!orderData.razorpay_payment_id);
  };

  if (!order && !loading) {
    return (
      <div className="glass-panel" style={{ maxWidth: '580px', margin: '40px auto', padding: '48px 32px', textAlign: 'center', borderRadius: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
        <h2 className="h2" style={{ marginBottom: '12px' }}>Order Details Not Found</h2>
        <p className="text-secondary" style={{ marginBottom: '32px' }}>
          We could not locate this order ID. If you completed a purchase, all your assets and keys are available in your Dashboard.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn-primary" style={{ padding: '12px 24px' }}>Go to Dashboard</Link>
          <Link href="/products" className="btn-secondary" style={{ padding: '12px 24px' }}>Browse Store</Link>
        </div>
      </div>
    );
  }

  if (order && !isOrderVerified(order)) {
    return (
      <div className="glass-panel" style={{ maxWidth: '580px', margin: '40px auto', padding: '48px 32px', textAlign: 'center', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h2 className="h2" style={{ marginBottom: '12px', color: '#EF4444' }}>Payment Incomplete</h2>
        <p className="text-secondary" style={{ marginBottom: '24px', lineHeight: 1.6 }}>
          We did not receive a confirmed payment for this order. Paid assets and license keys are only unlocked after payment is successfully completed.
        </p>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '32px' }}>
          If money was debited from your account, please wait 1-2 minutes for payment confirmation or contact our support team with your transaction details.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/checkout" className="btn-primary" style={{ padding: '12px 24px' }}>Return to Checkout</Link>
          <Link href="/" className="btn-secondary" style={{ padding: '12px 24px' }}>Go Home</Link>
        </div>
      </div>
    );
  }

  // Helper to find matching product details
  const getProductDetails = (item: any) => {
    const product = allProducts.find(p => p.id === item.id);
    let matchedVersion: any = null;
    if (product?.hasVersions && product?.versions && Array.isArray(product.versions)) {
      matchedVersion = product.versions.find((v: any) => v.id === item.versionId || v.name === item.versionName) || product.versions[0];
    }

    const downloadUrl = matchedVersion?.downloadUrl || matchedVersion?.assetUrl || product?.downloadUrl || product?.assetUrl || product?.fileUrl || null;
    const buttonText = product?.receiptButtonText || 'Download Asset';
    const receiptMessage = product?.receiptMessage || null;
    const thumb = matchedVersion?.imageUrl || product?.imageUrls?.[0] || product?.imageUrl || null;

    // Find license key generated for THIS specific item in THIS order
    const uId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
    const license = orderLicenses.find(l => l.productId === uId || l.productId === item.id || l.productName === item.name);

    return { product, downloadUrl, buttonText, receiptMessage, thumb, license };
  };

  const purchasedItemsList = order?.items || [];
  const parentItems = purchasedItemsList.filter((i: any) => !i.isBundleItem);
  const formattedTotal = Number(order?.amount || 0) === 0
    ? 'FREE'
    : (order?.currency === 'INR' ? `₹${Number(order?.amount).toFixed(2)}` : `$${Number(order?.amount).toFixed(2)}`);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      
      {/* Main Glass Card */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.22)'
      }}>
        
        {/* Celebratory Hero Header */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(0, 113, 227, 0.08) 100%)',
          padding: 'clamp(28px, 6vw, 44px) clamp(16px, 4vw, 36px)',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          {/* Subtle Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
            filter: 'blur(45px)',
            pointerEvents: 'none'
          }} />

          {/* Success Checkmark Badge */}
          <div style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.45), inset 0 2px 4px rgba(255,255,255,0.4)',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.4rem, 5vw, 1.95rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '10px',
            letterSpacing: '-0.025em'
          }}>
            Order Confirmed & Access Granted! 🎉
          </h1>

          <p style={{
            fontSize: 'clamp(0.92rem, 3.5vw, 1.05rem)',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            margin: '0 auto 22px auto',
            lineHeight: 1.55
          }}>
            Thank you for your order{order?.name ? `, ${order.name.split(' ')[0]}` : ''}! Your assets are ready for instant download below.
          </p>

          {/* Clean Responsive Receipt Metadata Chips Bar (Fixes awkward wrap & dot issues) */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            maxWidth: '100%',
            margin: '0 auto'
          }}>
            {/* Order ID Chip */}
            <button
              type="button"
              onClick={() => orderId && handleCopyOrderId(orderId)}
              title="Click to copy Order ID"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '6px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                #{orderId}
              </span>
              <span style={{ fontSize: '0.72rem', color: copiedOrderId ? '#10B981' : 'var(--text-muted)' }}>
                {copiedOrderId ? '✓ Copied' : '📋'}
              </span>
            </button>

            {/* Total Amount Chip */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '0.82rem',
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Total:</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>
                {formattedTotal}
              </span>
            </div>

            {/* Verified & Active Chip */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '6px 14px',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#10B981',
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
                display: 'inline-block'
              }} />
              <span>Verified & Active</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px) clamp(24px, 5vw, 44px) clamp(16px, 4vw, 32px)' }}>

          {/* Section Heading */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.25rem)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span>📦</span> Your Purchased Assets ({purchasedItemsList.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Direct high-speed delivery</span>
          </div>

          {/* Purchased Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '36px' }}>
            {parentItems.map((item: any, idx: number) => {
              const { product, downloadUrl, buttonText, receiptMessage, thumb, license } = getProductDetails(item);
              const subItems = purchasedItemsList.filter((sub: any) => sub.isBundleItem && sub.bundleId === item.id);

              return (
                <div key={idx} style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '20px',
                  padding: 'clamp(16px, 3.5vw, 24px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px'
                }}>
                  
                  {/* Item Header Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    
                    {/* Thumbnail & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 280px' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--bg-secondary)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}>
                        {thumb ? (
                          <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          item.category === 'Bundle' ? '🎁' : item.category === 'Plugin' ? '⚡' : '📦'
                        )}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.35 }}>
                          {item.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {item.category || 'Asset'}
                          </span>
                          {item.versionName && (
                            <span style={{
                              background: 'rgba(0, 113, 227, 0.1)',
                              color: '#0071E3',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {item.versionName}
                            </span>
                          )}
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: Number(item.price || 0) === 0 ? '#10B981' : 'var(--text-primary)' }}>
                            {Number(item.price || 0) === 0 ? 'FREE' : (order.currency === 'INR' ? `₹${Number(item.price).toFixed(2)}` : `$${Number(item.price).toFixed(2)}`)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Download Action Button (Always prominent & accessible) */}
                    <div style={{ flexShrink: 0 }}>
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #0071E3 0%, #0051A8 100%)',
                            color: '#FFFFFF',
                            padding: '13px 26px',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '0.94rem',
                            textDecoration: 'none',
                            boxShadow: '0 6px 20px rgba(0, 113, 227, 0.35)',
                            transition: 'all 0.2s ease',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>{buttonText}</span>
                        </a>
                      ) : (
                        <Link
                          href="/dashboard"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            textDecoration: 'none'
                          }}
                        >
                          <span>View in Dashboard &rarr;</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Receipt Custom Note if any */}
                  {receiptMessage && (
                    <div style={{
                      background: 'rgba(0, 113, 227, 0.06)',
                      border: '1px solid rgba(0, 113, 227, 0.18)',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>💡</span>
                      <span>{receiptMessage}</span>
                    </div>
                  )}

                  {/* License Key Box (ONLY IF GENERATED FOR THIS PURCHASE) */}
                  {license && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '14px',
                      padding: '16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🔑</span> License Key for Activation
                        </div>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          Active
                        </span>
                      </div>

                      <div style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid rgba(0, 113, 227, 0.25)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '1.08rem',
                          fontWeight: 700,
                          color: '#0071E3',
                          letterSpacing: '1.5px'
                        }}>
                          {license.licenseKey}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyKey(license.licenseKey)}
                          style={{
                            background: copiedKey === license.licenseKey ? '#10B981' : 'var(--bg-secondary)',
                            color: copiedKey === license.licenseKey ? '#FFFFFF' : 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {copiedKey === license.licenseKey ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Paste this license key into your extension / plugin preferences to unlock.
                      </div>
                    </div>
                  )}

                  {/* Clean Quick Review Section (Full Width, properly spaced and styled) */}
                  <QuickReview
                    productId={item.id}
                    productName={item.name}
                    userId={user?.uid || order?.userId}
                    userDisplayName={user?.displayName || order?.name || 'Verified Buyer'}
                    userPhoto={user?.photoURL || ''}
                    userEmail={user?.email || order?.email}
                    downloadUrl={downloadUrl || undefined}
                    buttonText={buttonText}
                  />

                  {/* Nested Bundle Sub-Items if this is a bundle */}
                  {subItems.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      paddingTop: '16px',
                      borderTop: '1px dashed var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Included in this bundle ({subItems.length} items):
                      </div>
                      {subItems.map((sub: any, sIdx: number) => {
                        const subDetails = getProductDetails(sub);
                        return (
                          <div key={sIdx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-secondary)',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ color: '#0071E3' }}>↳</span>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{sub.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub.category || 'Asset'}</div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {subDetails.license && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(subDetails.license.licenseKey)}
                                  style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-subtle)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    color: '#0071E3',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {copiedKey === subDetails.license.licenseKey ? 'Copied! ✓' : `Key: ${subDetails.license.licenseKey.substring(0, 8)}...`}
                                </button>
                              )}

                              {subDetails.downloadUrl && (
                                <a
                                  href={subDetails.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: '#0071E3',
                                    color: '#fff',
                                    padding: '5px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                  }}
                                >
                                  Download 📥
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Clean Dashboard Callout */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%)',
            border: '1px solid rgba(0, 113, 227, 0.2)',
            borderRadius: '18px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '36px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
              <span style={{ fontSize: '1.8rem' }}>⚡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  All Your Licenses & Assets are Saved in Your Dashboard
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  You can log in anytime to re-download files, check lifetime updates, and view all active license keys.
                </div>
              </div>
            </div>

            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Open Dashboard &rarr;
            </Link>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Link
              href="/dashboard"
              className="btn-primary"
              style={{
                textAlign: 'center',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '14px',
                textDecoration: 'none'
              }}
            >
              Go to My Dashboard 🚀
            </Link>

            <Link
              href="/products"
              className="btn-secondary"
              style={{
                textAlign: 'center',
                padding: '16px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '14px',
                textDecoration: 'none'
              }}
            >
              Continue Shopping 🛍️
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="container section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Loading order details...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
