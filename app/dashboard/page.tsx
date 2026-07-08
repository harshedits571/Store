'use client';
import React, { useState, useEffect } from 'react';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrency } from '../context/CurrencyContext';

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'licenses' | 'reviews' | 'wishlist'>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    setLoading(true);
    let customerLoaded = false;
    let ordersLoaded = false;
    let licensesLoaded = false;
    
    const checkLoading = () => {
      if (customerLoaded && ordersLoaded && licensesLoaded) {
        setLoading(false);
      }
    };

    const unsubCustomer = onSnapshot(doc(db, "customers", user.email || ''), (docSnap) => {
      if (docSnap.exists()) {
        const custData: any = { id: docSnap.id, ...docSnap.data() };
        setCustomer(custData);
        setEditAddress(custData.address || '');
        setEditPhone(custData.phone || '');
      }
      customerLoaded = true;
      checkLoading();
    });

    const qOrders = query(collection(db, "leads"), where("email", "==", user.email));
    const unsubOrders = onSnapshot(qOrders, (orderSnap) => {
      const orderList = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      orderList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(orderList);
      ordersLoaded = true;
      checkLoading();
    });

    const qLicenses = query(collection(db, "licenses"), where("email", "==", user.email));
    const unsubLicenses = onSnapshot(qLicenses, (licenseSnap) => {
      const licenseList = licenseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLicenses(licenseList);
      licensesLoaded = true;
      checkLoading();
    });

    return () => {
      unsubCustomer();
      unsubOrders();
      unsubLicenses();
    };
  }, [user, authLoading, router]);

  const handleSaveProfile = async () => {
    if (!user?.email) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "customers", user.email), {
        address: editAddress,
        phone: editPhone
      });
      setCustomer((prev: any) => ({ ...prev, address: editAddress, phone: editPhone }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    }
    setSavingProfile(false);
  };

  const panelBg = 'var(--bg-card)';
  const borderColor = 'var(--border-subtle)';
  const textMuted = 'var(--text-muted)';

  if (authLoading) {
    return <div className="container section" style={{ textAlign: 'center', color: 'var(--text-primary)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading your dashboard...</div>;
  }

  if (!user) return null; // Will redirect

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'sans-serif', paddingBottom: '64px', paddingTop: '80px' }}>

      {/* Top Navigation Bar / Header */}
      <div className="md-px-16" style={{ borderBottom: `1px solid ${borderColor}`, padding: '24px 48px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: textMuted, marginBottom: '8px' }}>
          <Link href="/" style={{ color: '#3B82F6', textDecoration: 'none' }}>Home</Link>
          <span>&gt;</span>
          <span>Profile</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0' }}>Profile</h1>
          <button onClick={() => useAuth().logout()} className="btn-secondary" style={{ padding: '8px 16px', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)' }}>Sign Out</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: textMuted, minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading dashboard data...</div>
      ) : (
      <div className="md-px-16" style={{ padding: '0 48px' }}>
        {/* TOP ROW: Profile & Address */}
        <div className="md-stack" style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flexWrap: 'wrap', marginBottom: '48px' }}>

          {/* Profile Card */}
          <div className="md-p-24" style={{ flex: '1 1 300px', background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 600 }}>{user.displayName || 'Customer'}</h2>
                <div style={{ color: textMuted, fontSize: '0.875rem' }}>
                  Joined {customer?.firstOrderDate ? new Date(customer.firstOrderDate.seconds * 1000).toLocaleDateString() : 'recently'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', borderTop: `1px solid ${borderColor}`, paddingTop: '24px' }}>
              <div>
                <div style={{ color: textMuted, fontSize: '0.75rem', marginBottom: '8px' }}>Total Spent (Approx)</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>${Number(customer?.totalSpent || 0).toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: textMuted, fontSize: '0.75rem', marginBottom: '8px' }}>Last Order</div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  {customer?.lastOrderDate ? new Date(customer.lastOrderDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: textMuted, fontSize: '0.75rem', marginBottom: '8px' }}>Total Orders</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{customer?.ordersCount || 0}</div>
              </div>
            </div>
          </div>

          {/* Default Address Card */}
          <div className="md-p-24" style={{ flex: '1 1 300px', background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '32px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Default Address</h3>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
                  ✎ Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>Address & Country</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', fontSize: '0.875rem' }}
                    placeholder="e.g. Vancouver, British Columbia, Canada"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.75rem', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', fontSize: '0.875rem' }}
                    placeholder="+1234567890"
                  />
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px' }}>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>Cancel</button>
                  <button onClick={handleSaveProfile} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.875rem' }} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Address</div>
                  <div style={{ color: textMuted, fontSize: '0.875rem', textAlign: 'right', maxWidth: '60%' }}>
                    {customer?.address || 'No address provided'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Email</div>
                  <div style={{ color: '#3B82F6', fontSize: '0.875rem' }}>{user.email}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Phone</div>
                  <div style={{ color: '#3B82F6', fontSize: '0.875rem' }}>{customer?.phone || 'Not provided'}</div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* BOTTOM SECTION: TABS */}
        <div style={{ borderBottom: `1px solid ${borderColor}`, display: 'flex', gap: '32px', marginBottom: '32px' }}>
          {[
            { id: 'orders', label: 'Orders', count: orders.length },
            { id: 'licenses', label: 'Licenses', count: licenses.length },
            { id: 'reviews', label: 'Reviews', count: 0 },
            { id: 'wishlist', label: 'Wishlist', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? '#3B82F6' : textMuted,
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: '0.875rem',
                paddingBottom: '16px',
                borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {tab.label} {tab.count !== null && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}

        {activeTab === 'orders' && (
          <div className="table-responsive">
            <table className="md-table-compact" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Order</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Items</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Date</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: textMuted }}>No orders found.</td></tr>
                ) : (
                  orders.map((order, i) => (
                    <React.Fragment key={order.id}>
                      <tr 
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        style={{ 
                          borderBottom: expandedOrderId === order.id ? 'none' : (i === orders.length - 1 ? 'none' : `1px solid ${borderColor}`),
                          cursor: 'pointer',
                          background: expandedOrderId === order.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = expandedOrderId === order.id ? 'rgba(255,255,255,0.02)' : 'transparent'}
                      >
                        <td style={{ padding: '24px 8px', color: '#3B82F6', fontWeight: 500 }}>
                          <span style={{ display: 'inline-block', width: '16px', fontSize: '0.75rem', color: textMuted }}>
                            {expandedOrderId === order.id ? '▼' : '▶'}
                          </span>
                          #{order.id.substring(0, 6)}
                        </td>
                        <td style={{ padding: '24px 8px' }}>
                          <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                            Success ✓
                          </span>
                        </td>
                        <td style={{ padding: '24px 8px', color: 'var(--text-primary)' }}>{order.items?.length || 1} items</td>
                        <td style={{ padding: '24px 8px', textAlign: 'right', color: textMuted }}>
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : ''}
                        </td>
                        <td style={{ padding: '24px 8px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                          {order.currency === 'INR' ? `₹${Number(order.amount).toFixed(2)}` : `$${Number(order.amount).toFixed(2)}`}
                        </td>
                      </tr>
                      
                      {/* Expanded Content: Show Items */}
                      {expandedOrderId === order.id && (
                        <tr style={{ borderBottom: i === orders.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                          <td colSpan={5} style={{ padding: '0 24px 24px 24px' }}>
                            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: textMuted, marginBottom: '12px', fontWeight: 600 }}>Purchased Items</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: idx === order.items.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                                    <div>
                                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {item.isBundleItem ? <span style={{ color: textMuted, fontSize: '0.875rem' }}>↳</span> : null}
                                        {item.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: textMuted }}>{item.category}</div>
                                    </div>
                                    {!item.isBundleItem && (
                                      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                        {order.currency === 'INR' ? `₹${Number(item.price || 0).toFixed(2)}` : `$${Number(item.price || 0).toFixed(2)}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {licenses.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: textMuted }}>No licenses generated.</div>
            ) : (
              licenses.map(lic => (
                <div key={lic.id} style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: 600, margin: '0 0 8px 0' }}>{lic.productName}</h3>
                    <div style={{ display: 'inline-block', background: '#000', padding: '12px 16px', borderRadius: '4px', border: '1px dashed var(--accent-primary)', fontFamily: 'monospace', fontSize: '1.125rem', color: 'var(--accent-primary)' }}>
                      {lic.licenseKey}
                    </div>
                  </div>
                  <button className="btn-primary" style={{ padding: '10px 24px' }}>Download Asset</button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ padding: '48px', textAlign: 'center', color: textMuted, fontStyle: 'italic', background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            You haven't left any reviews yet.
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div style={{ padding: '48px', textAlign: 'center', color: textMuted, fontStyle: 'italic', background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            Your wishlist is empty.
          </div>
        )}

      </div>
      )}
    </div>
  );
}
