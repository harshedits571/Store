'use client';
import { useState, useEffect, use } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const resolvedParams = use(params);
  const decodedEmail = decodeURIComponent(resolvedParams.email);

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subsLoading, setSubsLoading] = useState(true);
  
  const [notes, setNotes] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Customer Profile
        const docSnap = await getDoc(doc(db, "customers", decodedEmail));
        if (docSnap.exists()) {
          setCustomer({ id: docSnap.id, ...docSnap.data() });
          setNotes(docSnap.data().notes || '');
        }

        // Fetch Customer Orders
        const q = query(collection(db, "leads"), where("email", "==", decodedEmail));
        const orderSnap = await getDocs(q);
        const orderList = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        // Sort descending by date
        orderList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(orderList);

        // Fetch Subscriptions & History
        setSubsLoading(true);
        try {
          const subsRes = await fetch(`/api/admin/customer-subscriptions?email=${encodeURIComponent(decodedEmail)}`);
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            setSubscriptions(subsData.subscriptions || []);
          }
        } catch (e) {
          console.error("Error fetching subscriptions:", e);
        }
        setSubsLoading(false);

      } catch (err) {
        console.error("Error fetching customer:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [decodedEmail]);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await updateDoc(doc(db, "customers", decodedEmail), {
        notes: notes
      });
      // Optionally show a toast here
    } catch (err) {
      console.error(err);
      alert("Error saving note");
    }
    setSavingNote(false);
  };

  const handleCancelSubscription = async (sub: any) => {
    if (!confirm(`Are you sure you want to cancel the subscription for ${sub.meta.productName}? They will retain access until the end of the billing cycle.`)) return;
    
    try {
       const res = await fetch('/api/cancel-subscription', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ subscriptionId: sub.meta.subscriptionId, licenseKey: sub.meta.licenseKey })
       });
       if (res.ok) {
          alert('Subscription cancelled successfully.');
          window.location.reload();
       } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to cancel');
       }
    } catch (e: any) {
       alert(e.message || 'Error cancelling subscription');
    }
  };

  const panelBg = 'var(--bg-card)';
  const borderColor = 'var(--border-subtle)';
  const textMuted = 'var(--text-muted)';

  if (loading) {
    return <div style={{ color: 'var(--text-primary)', padding: '32px' }}>Loading customer details...</div>;
  }

  if (!customer) {
    return <div style={{ color: 'var(--text-primary)', padding: '32px' }}>Customer not found.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', margin: '-32px', padding: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'sans-serif', paddingBottom: '64px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: textMuted, marginBottom: '8px' }}>
            <Link href="/admin/customers" style={{ color: '#3B82F6', textDecoration: 'none' }}>Customers</Link>
            <span>&gt;</span>
            <span>{customer.name}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0' }}>Customer details</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' }}>Delete customer</button>
          <button className="btn-secondary" style={{ padding: '8px 16px' }}>Reset password</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column (Profile, Address, Notes) */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', borderBottom: `1px solid ${borderColor}`, paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0071E3, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 600,
                color: '#ffffff',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 113, 227, 0.25)'
              }}>
                {customer.photoURL ? (
                  <img
                    src={customer.photoURL}
                    alt={customer.name || 'Customer'}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  customer.name?.charAt(0).toUpperCase() || 'C'
                )}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>{customer.name}</h2>
                <div style={{ color: textMuted, fontSize: '0.875rem' }}>
                  Joined {customer.firstOrderDate ? new Date(customer.firstOrderDate.seconds * 1000).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{customer.ordersCount || 0}</div>
                <div style={{ color: textMuted, fontSize: '0.75rem' }}>Orders</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  {orders[0]?.currency === 'INR' ? '₹' : '$'}{Number(customer.totalSpent || 0).toFixed(2)}
                </div>
                <div style={{ color: textMuted, fontSize: '0.75rem' }}>Spent</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>0</div>
                <div style={{ color: textMuted, fontSize: '0.75rem' }}>Reviews</div>
              </div>
            </div>
          </div>

          {/* Default Address */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Default Address</h3>
              <span style={{ color: textMuted, cursor: 'pointer' }}>✎</span>
            </div>
            
            <div style={{ color: textMuted, fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Address<br/>
              {customer.city === 'Unknown' ? 'No address provided' : customer.city}<br/>
              Country
            </div>
            
            <div style={{ color: textMuted, fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Email<br/>
              <span style={{ color: '#3B82F6' }}>{customer.email}</span>
            </div>
            
            <div style={{ color: textMuted, fontSize: '0.875rem', lineHeight: '1.5' }}>
              Phone<br/>
              {customer.phone || 'Not provided'}
            </div>
          </div>

          {/* Notes */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem' }}>Notes on Customer</h3>
            <textarea 
              style={{ width: '100%', background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', resize: 'vertical', minHeight: '100px', fontSize: '0.875rem', marginBottom: '16px' }}
              placeholder="Add internal notes about this customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button 
              className="btn-secondary" 
              style={{ width: '100%', padding: '10px' }}
              onClick={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>


        {/* Right Column (Orders, Wishlist, Reviews) */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Subscriptions & History */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Subscriptions & History</h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              {subsLoading ? (
                <div style={{ color: textMuted, textAlign: 'center' }}>Loading subscriptions...</div>
              ) : subscriptions.length === 0 ? (
                <div style={{ color: textMuted, textAlign: 'center' }}>No active subscriptions found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {subscriptions.map((sub, i) => (
                    <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
                      {/* Sub Header */}
                      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${borderColor}` }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{sub.meta.productName}</div>
                          <div style={{ fontSize: '0.875rem', color: textMuted, marginTop: '4px' }}>
                            {sub.subscription?.period ? sub.subscription.period.toUpperCase() : 'RECURRING'} PLAN
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                            background: sub.subscription?.status === 'active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                            color: sub.subscription?.status === 'active' ? '#34D399' : '#F87171'
                          }}>
                            {sub.subscription?.status || 'Unknown'} {sub.meta.pendingCancellation || sub.subscription?.cancel_at_cycle_end ? '(Cancels at cycle end)' : ''}
                          </span>
                          {sub.subscription?.status === 'active' && !sub.meta.pendingCancellation && !sub.subscription?.cancel_at_cycle_end && (
                            <div style={{ marginTop: '12px' }}>
                              <button onClick={() => handleCancelSubscription(sub)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' }}>
                                Force Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Sub Details */}
                      <div style={{ padding: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap', borderBottom: `1px solid ${borderColor}` }}>
                        <div>
                          <div style={{ color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Total Payments</div>
                          <div style={{ fontWeight: 500 }}>{sub.subscription?.paid_count || 0}</div>
                        </div>
                        {sub.subscription?.charge_at && sub.subscription?.status === 'active' && !sub.meta.pendingCancellation && (
                          <div>
                            <div style={{ color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Next Payment</div>
                            <div style={{ fontWeight: 500 }}>{new Date(sub.subscription.charge_at * 1000).toLocaleDateString()}</div>
                          </div>
                        )}
                        {sub.subscription?.current_end && (sub.meta.pendingCancellation || sub.subscription?.status === 'cancelled' || sub.subscription?.cancel_at_cycle_end) && (
                          <div>
                            <div style={{ color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Access Ends On</div>
                            <div style={{ fontWeight: 500 }}>{new Date(sub.subscription.current_end * 1000).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>

                      {/* Invoices Timeline */}
                      <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>Transaction History</h4>
                        {sub.invoices && sub.invoices.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sub.invoices.map((inv: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                <div>
                                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {inv.currency === 'INR' ? '₹' : '$'}{(inv.amount / 100).toFixed(2)}
                                  </div>
                                  <div style={{ color: textMuted, fontSize: '0.75rem' }}>
                                    {inv.issued_at ? new Date(inv.issued_at * 1000).toLocaleString() : ''}
                                  </div>
                                </div>
                                <div>
                                  <span style={{ 
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                                    background: inv.status === 'paid' ? 'rgba(52, 211, 153, 0.1)' : (inv.status === 'failed' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255, 255, 255, 0.1)'),
                                    color: inv.status === 'paid' ? '#34D399' : (inv.status === 'failed' ? '#F87171' : 'var(--text-muted)')
                                  }}>
                                    {inv.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: textMuted, fontSize: '0.875rem' }}>No transactions found for this subscription.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Orders Table */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Orders ({orders.length})</h3>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Order</th>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Total</th>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Payment Status</th>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Product(s)</th>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: textMuted }}>No orders found.</td></tr>
                ) : (
                  orders.map((order, i) => (
                    <tr key={order.id} style={{ borderBottom: i === orders.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                      <td style={{ padding: '16px 24px', color: '#0071E3', fontWeight: 600 }}>#{order.id.substring(0, 6)}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {order.currency === 'INR' ? '₹' : '$'}{Number(order.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          PAID ✓
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {order.items && order.items.length > 0 
                          ? order.items.map((item: any) => item.name).join(', ') 
                          : 'Unknown Product'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {order.createdAt ? new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleString() : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Wishlist Placeholder */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Wishlist / Active Cart</h3>
            </div>
            <div style={{ padding: '48px 24px', textAlign: 'center', color: textMuted, fontStyle: 'italic' }}>
              Live cart syncing is currently in development.
            </div>
          </div>

          {/* Ratings & Reviews Placeholder */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Ratings & Reviews</h3>
            </div>
            <div style={{ padding: '48px 24px', textAlign: 'center', color: textMuted, fontStyle: 'italic' }}>
              Review system module has not been integrated yet.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
