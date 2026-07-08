'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        // Fetch Order
        const orderSnap = await getDoc(doc(db, "leads", orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          setOrder(orderData);

          // Fetch Licenses associated with this paymentId
          if (orderData.paymentId) {
            const q = query(collection(db, "licenses"), where("paymentId", "==", orderData.paymentId));
            const licSnap = await getDocs(q);
            setLicenses(licSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        }
      } catch (err) {
        console.error("Error fetching success details:", err);
      }
      setLoading(false);
    };
    fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return <div className="text-center p-8">Loading order details...</div>;
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '680px', margin: '0 auto', padding: '0', overflow: 'hidden', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>
      {/* Header Section */}
      <div style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', padding: '48px 48px 32px 48px', borderBottom: '1px solid rgba(52, 211, 153, 0.2)', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 0 30px rgba(52, 211, 153, 0.4)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 className="h2" style={{ marginBottom: '12px', color: 'white' }}>Payment Successful!</h1>
        <p className="text-secondary" style={{ fontSize: '1.125rem', maxWidth: '400px', margin: '0 auto' }}>
          Thank you for your purchase, {order?.name ? order.name.split(' ')[0] : 'Creator'}! Your creative journey starts here.
        </p>
      </div>

      <div className="success-content" style={{ padding: '48px' }}>
        {/* Order Info */}
        <div className="md-stack" style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'flex-start', marginBottom: '40px', paddingBottom: '32px', borderBottom: '1px dashed var(--border-subtle)' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Order ID</div>
            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.125rem', color: 'white', wordBreak: 'break-all' }}>#{orderId}</div>
          </div>
          <div className="md-text-left" style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount Paid</div>
            <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'white' }}>
              {order?.currency === 'INR' ? `₹${Number(order?.amount).toFixed(2)}` : `$${Number(order?.amount).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* License Keys Section */}
        {licenses.length > 0 ? (
          <div style={{ marginBottom: '40px' }}>
            <h3 className="h3" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-primary)' }}>🔑</span> Your License Keys
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {licenses.map(lic => (
                <div key={lic.id} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 500, fontSize: '1.125rem' }}>{lic.productName}</div>
                    <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Active</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '3px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-primary)', textAlign: 'center', wordBreak: 'break-all' }}>
                      {lic.licenseKey}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: 0 }}>
                    Keep this key safe. You will need it to activate the plugin.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '40px', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <p className="text-secondary" style={{ margin: 0 }}>No license keys required for these items.</p>
          </div>
        )}

        {/* Purchased Items Section */}
        {order?.items && order.items.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h3 className="h3" style={{ marginBottom: '24px' }}>Purchased Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.items.filter((i: any) => !i.isBundleItem).map((parentItem: any, i: number) => {
                const subItems = order.items.filter((sub: any) => sub.isBundleItem && sub.bundleId === parentItem.id);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid transparent' }}>
                    
                    {/* Parent Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          {parentItem.category === 'Bundle' ? '🎁' : parentItem.category === 'Plugin' ? '⚡' : '📦'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{parentItem.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{parentItem.category}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {order.currency === 'INR' ? '₹' : '$'}{Number(parentItem.price || 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Nested Bundle Sub-Items */}
                    {subItems.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {subItems.map((sub: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>↳</span>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{sub.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.category}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '48px' }}>
          <Link href="/dashboard" className="btn-primary" style={{ flex: 1, textAlign: 'center' }}>Go to My Dashboard</Link>
          <Link href="/" className="btn-secondary" style={{ flex: 1, textAlign: 'center' }}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="container section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Suspense fallback={<div>Loading order details...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
