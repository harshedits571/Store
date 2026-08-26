'use client';
import React, { useState, useEffect } from 'react';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrency } from '../context/CurrencyContext';
import { useCart, CartItem } from '../context/CartContext';
import styles from './Dashboard.module.css';
import QuickReview from '../components/QuickReview';

export default function CustomerDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { formatPrice } = useCurrency();
  const { addToCart, clearCart } = useCart();
  const router = useRouter();

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'library' | 'orders' | 'reviews' | 'wishlist'>('library');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Auto-sync customer licenses from API
  useEffect(() => {
    if (!user?.email) return;
    const fetchLicensesFromApi = async () => {
      try {
        const cleanEmail = user.email!.trim().toLowerCase();
        const res = await fetch(`/api/customer-licenses?email=${encodeURIComponent(cleanEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.licenses && Array.isArray(data.licenses)) {
            setLicenses(prev => {
              const map = new Map<string, any>();
              prev.forEach(l => map.set(l.id || l.licenseKey, l));
              data.licenses.forEach((l: any) => map.set(l.id || l.licenseKey, l));
              return Array.from(map.values());
            });
          }
        }
      } catch (e) {
        console.warn("Error fetching customer licenses from API:", e);
      }
    };
    fetchLicensesFromApi();
  }, [user]);

  // Helper to strictly verify if an order is completed and paid/verified
  const isOrderVerified = (order: any) => {
    if (!order) return false;
    const status = (order.status || '').toLowerCase();
    const isVerifiedStatus = status === 'verified' || status === 'completed' || status === 'success';
    const amount = Number(order.amount || 0);
    if (amount === 0) return isVerifiedStatus;
    return isVerifiedStatus && (!!order.paymentId || !!order.razorpay_payment_id);
  };

  const libraryItems = React.useMemo(() => {
    const items: any[] = [];
    const processedKeys = new Set();
    const processedProductIds = new Set();

    // Filter to only verified completed orders (exclude 'interested' / incomplete checkout attempts)
    const verifiedOrders = orders.filter(isOrderVerified);

    // 1. Process all active licenses
    licenses.forEach(license => {
      if (license.status === 'blocked' || license.status === 'expired' || license.status === 'cancelled') {
        return;
      }

      let foundItemData: any = null;
      let orderId = license.orderId || null;
      let date = license.createdAt;

      // Find matching verified order item
      verifiedOrders.forEach(order => {
        if (order.id === license.orderId || order.paymentId === license.paymentId || (!license.paymentId)) {
          order.items?.forEach((item: any) => {
            const uId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
            if ((uId === license.productId || item.id === license.productId) && !foundItemData) {
              foundItemData = item;
              orderId = order.id;
              if (order.createdAt) date = order.createdAt;
            }
          });
        }
      });

      if (!foundItemData) {
        foundItemData = {
          id: license.productId,
          name: license.productName || 'Creative Asset',
          category: 'Plugin',
        };
      }

      const licKey = license.licenseKey || license.id;
      if (!processedKeys.has(licKey)) {
        items.push({
          uniqueId: licKey,
          orderId,
          date,
          itemData: foundItemData,
          licenseKey: licKey,
          isSubscription: license.isSubscription,
          subscriptionId: license.subscriptionId,
          status: license.status || 'active',
          expiresAt: license.expiresAt,
          lastRenewedAt: license.lastRenewedAt,
          grantedDurationDays: license.grantedDurationDays,
          pendingCancellation: license.pendingCancellation || false,
        });
        processedKeys.add(licKey);
        processedProductIds.add(foundItemData.id);
      }
    });

    // 2. Process all verified purchased items from verified orders ONLY
    verifiedOrders.forEach(order => {
      order.items?.forEach((item: any, idx: number) => {
        const product = allProducts.find(p => p.id === item.id);
        const uId = item.versionId ? `${item.id}_${item.versionId}` : item.id;

        if (!processedProductIds.has(item.id) && !processedProductIds.has(uId)) {
          items.push({
            uniqueId: `${order.id}_${idx}`,
            orderId: order.id,
            date: order.createdAt,
            itemData: item,
            licenseKey: null,
            isSubscription: product?.isSubscription || false,
            subscriptionId: order.razorpay_subscription_id || null,
            status: 'active'
          });
          processedProductIds.add(item.id);
        }
      });
    });

    items.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
    return items;
  }, [orders, licenses, allProducts]);

  // Subscription Modal State
  const [manageSubItem, setManageSubItem] = useState<any>(null);
  const [subData, setSubData] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'confirm' | 'cancelling' | 'success' | 'error'>('idle');
  const [cancelError, setCancelError] = useState('');

  const handleRenewSubscription = (item: any) => {
    const product = allProducts.find(p => p.id === item.itemData?.id || p.id === item.productId);
    
    let version = null;
    if (product && product.hasVersions && product.versions) {
      version = product.versions.find((v: any) => v.id === item.itemData?.versionId || v.name === item.itemData?.versionName);
    }

    const price = version ? (version.price !== '' && version.price != null ? parseFloat(version.price) : 0) : (product?.price ? parseFloat(product.price) : 0);
    const salePrice = version ? (version.salePrice !== '' && version.salePrice != null ? parseFloat(version.salePrice) : null) : (product?.salePrice ? parseFloat(product.salePrice) : null);
    const inrPrice = version ? (version.inrPrice !== '' && version.inrPrice != null ? parseFloat(version.inrPrice) : price * 84) : (product?.inrPrice ? parseFloat(product.inrPrice) : price * 84);
    const inrSalePrice = version ? (version.inrSalePrice !== '' && version.inrSalePrice != null ? parseFloat(version.inrSalePrice) : (salePrice ? salePrice * 84 : null)) : (product?.inrSalePrice ? parseFloat(product.inrSalePrice) : null);

    const cartItem: CartItem = {
      id: product ? product.id : item.itemData.id,
      name: product ? product.name : (item.itemData?.name || 'Subscription Product'),
      price: price,
      salePrice: salePrice,
      inrPrice: inrPrice,
      inrSalePrice: inrSalePrice,
      category: product ? product.category : (item.itemData?.category || 'Plugin'),
      requiresLicense: product ? product.requiresLicense !== false : true,
      versionId: version ? version.id : item.itemData?.versionId,
      versionName: version ? version.name : item.itemData?.versionName,
      isSubscription: true,
      planId: version ? version.planId : (product ? product.planId : null)
    };

    clearCart();
    addToCart(cartItem);
    router.push('/checkout');
  };

  const handleManageClick = async (item: any) => {
    setManageSubItem(item);
    setSubData(null);
    setSubLoading(true);
    setCancelStatus('idle');
    setCancelError('');
    
    try {
       const res = await fetch(`/api/subscription/${item.subscriptionId}`);
       if (res.ok) {
          const data = await res.json();
          setSubData(data.subscription);
       }
    } catch(e) { console.error(e); }
    setSubLoading(false);
  };

  const handleCancelSubscription = async () => {
    setCancelStatus('cancelling');
    try {
       const res = await fetch('/api/cancel-subscription', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ subscriptionId: manageSubItem.subscriptionId, licenseKey: manageSubItem.licenseKey })
       });
       if (res.ok) {
          const data = await res.json();
          setSubData(data.subscription);
          setCancelStatus('success');
          // Update the local item state so it reflects pending cancellation without refreshing
          manageSubItem.pendingCancellation = true;
       } else {
          const errData = await res.json();
          setCancelError(errData.error || 'Failed to cancel');
          setCancelStatus('error');
       }
    } catch (e: any) {
       setCancelError(e.message || 'Error cancelling subscription');
       setCancelStatus('error');
    }
  };

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
    let productsLoaded = false;
    
    const checkLoading = () => {
      if (customerLoaded && ordersLoaded && licensesLoaded && productsLoaded) {
        setLoading(false);
      }
    };

    const unsubProducts = onSnapshot(collection(db, "products"), (productSnap) => {
      setAllProducts(productSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      productsLoaded = true;
      checkLoading();
    });

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
      unsubProducts();
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
    <div className={styles.dashboardContainer}>

      {/* Top Header */}
      <div className={styles.dashboardHeader}>
        <div>
          <div className={styles.breadcrumbs}>
            <Link href="/" className={styles.breadcrumbLink}>Home</Link>
            <span>/</span>
            <span>Profile</span>
          </div>
          <h1 className={styles.pageTitle}>Account Dashboard</h1>
        </div>
        <button onClick={() => logout()} className={styles.signOutBtn}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: textMuted, minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading dashboard data...</div>
      ) : (
      <div>
        {/* Promoter / Creator Hub Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.1), rgba(139, 92, 246, 0.1))',
          border: '1px solid rgba(0, 113, 227, 0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Creator & Promoter Collaborations Hub
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                View your granted trial extension licenses, countdown timers, submit video proofs, and track your affiliate commissions.
              </div>
            </div>
          </div>
          <Link href="/promoter/dashboard" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            Open Creator Dashboard &rarr;
          </Link>
        </div>

        {/* TOP ROW: Profile & Address */}
        <div className={styles.topGrid}>

          {/* Profile Card */}
          <div className={styles.premiumCard}>
            <div className={styles.profileTop}>
              <div className={styles.avatarBox} style={{ overflow: 'hidden', padding: 0 }}>
                {user.photoURL || customer?.photoURL ? (
                  <img
                    src={user.photoURL || customer?.photoURL}
                    alt={user.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user.displayName || user.email || 'User')}&scale=110`}
                    alt={user.displayName || 'Profile'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px' }}
                  />
                )}
              </div>
              <div>
                <h2 className={styles.profileName}>{user.displayName || 'Customer'}</h2>
                <div className={styles.joinedBadge}>
                  <span>🗓️</span> Joined {customer?.firstOrderDate ? new Date(customer.firstOrderDate.seconds * 1000).toLocaleDateString() : 'recently'}
                </div>
              </div>
            </div>

            <div className={styles.metricsRow}>
              <div className={styles.metricBox}>
                <div className={styles.metricLabel}>Total Spent</div>
                <div className={styles.metricValue}>${Number(customer?.totalSpent || 0).toFixed(2)}</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricLabel}>Total Orders</div>
                <div className={styles.metricValue}>{customer?.ordersCount || orders.length || 0}</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricLabel}>Library Assets</div>
                <div className={styles.metricValue}>{libraryItems.length}</div>
              </div>
            </div>
          </div>

          {/* Default Address Card */}
          <div className={styles.premiumCard}>
            <div className={styles.addressHeader}>
              <h3 className={styles.cardTitle}>Default Contact & Details</h3>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                  ✎ Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Address & Country</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.875rem' }}
                    placeholder="e.g. Mumbai, India / New York, USA"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: textMuted, fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.875rem' }}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '12px' }}>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem', borderRadius: '99px' }}>Cancel</button>
                  <button onClick={handleSaveProfile} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.875rem', borderRadius: '99px' }} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
                <div className={styles.infoRow}>
                  <div className={styles.infoKey}>📍 Address</div>
                  <div className={styles.infoVal}>
                    {customer?.address || 'No address provided'}
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoKey}>✉️ Email</div>
                  <div className={styles.infoVal} style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{user.email}</div>
                </div>

                <div className={styles.infoRow}>
                  <div className={styles.infoKey}>📞 Phone</div>
                  <div className={styles.infoVal}>{customer?.phone || 'Not provided'}</div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* BOTTOM SECTION: TABS */}
        <div className={styles.tabsNav}>
          {[
            { id: 'library', label: 'My Library', count: libraryItems.length },
            { id: 'orders', label: 'Order History', count: orders.length },
            { id: 'reviews', label: 'Reviews', count: 0 },
            { id: 'wishlist', label: 'Wishlist', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            >
              {tab.label} {tab.count !== null && <span>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}

        {activeTab === 'orders' && (
          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
            <table className="md-table-compact" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Order</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Items</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '16px 8px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: textMuted }}>No orders found.</td></tr>
                ) : (
                  orders.map((order, i) => {
                    const verified = isOrderVerified(order);
                    return (
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
                        <td style={{ padding: '24px 8px', color: '#3B82F6', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: '16px', fontSize: '0.75rem', color: textMuted }}>
                            {expandedOrderId === order.id ? '▼' : '▶'}
                          </span>
                          #{order.id.substring(0, 6)}
                        </td>
                        <td style={{ padding: '24px 8px', whiteSpace: 'nowrap' }}>
                          {verified ? (
                            <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                              Completed ✓
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                              Incomplete / Unpaid
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '24px 8px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{order.items?.length || 1} items</td>
                        <td style={{ padding: '24px 8px', textAlign: 'right', color: textMuted, whiteSpace: 'nowrap' }}>
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : ''}
                        </td>
                        <td style={{ padding: '24px 8px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {order.currency === 'INR' ? `₹${Number(order.amount).toFixed(2)}` : `$${Number(order.amount).toFixed(2)}`}
                        </td>
                      </tr>
                      
                      {/* Expanded Content: Show Items */}
                      {expandedOrderId === order.id && (
                        <tr style={{ borderBottom: i === orders.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                          <td colSpan={5} style={{ padding: '0 8px 24px 8px' }}>
                            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: textMuted, marginBottom: '12px', fontWeight: 600 }}>Purchased Items</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '8px', borderBottom: idx === order.items.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                                    <div style={{ flex: '1 1 200px' }}>
                                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {item.isBundleItem ? <span style={{ color: textMuted, fontSize: '0.875rem' }}>↳</span> : null}
                                        {item.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: textMuted }}>{item.category}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                      {!item.isBundleItem && (
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                          {order.currency === 'INR' ? `₹${Number(item.price || 0).toFixed(2)}` : `$${Number(item.price || 0).toFixed(2)}`}
                                        </div>
                                      )}
                                      {/* Download Button ONLY if verified */}
                                      {verified && allProducts.find(p => p.id === item.id)?.downloadUrl ? (
                                        <a 
                                          href={allProducts.find(p => p.id === item.id)?.downloadUrl} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="btn-secondary" 
                                          style={{ padding: '6px 16px', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          Download
                                        </a>
                                      ) : (!verified ? (
                                        <span style={{ fontSize: '0.75rem', color: textMuted, fontStyle: 'italic' }}>
                                          Payment pending
                                        </span>
                                      ) : null)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'library' && (
          <div className={styles.libraryGrid}>
            {libraryItems.length === 0 ? (
              <div style={{ padding: '64px 32px', textAlign: 'center', color: textMuted, gridColumn: '1 / -1', background: panelBg, borderRadius: '20px', border: `1px dashed ${borderColor}` }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 700 }}>Your library is empty</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem' }}>When you purchase assets, they will appear here for instant download.</p>
                <Link href="/products" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '99px', textDecoration: 'none' }}>Browse Catalog</Link>
              </div>
            ) : (
              libraryItems.map(item => {
                const product = allProducts.find(p => p.id === item.itemData.id);
                const imgUrl = product?.imageUrls?.[0] || product?.imageUrl || '';
                const downloadUrl = product?.downloadUrl;
                
                return (
                  <div key={item.uniqueId} className={styles.assetCard}>
                    <div className={styles.assetThumb} style={{ backgroundImage: imgUrl ? `url(${imgUrl})` : 'none' }}>
                      <div className={styles.categoryTag}>
                        {item.itemData.category || 'Asset'}
                      </div>
                    </div>
                    <div className={styles.assetBody}>
                      <h3 className={styles.assetTitle}>{item.itemData.name}</h3>
                      {item.itemData.versionName && <div className={styles.variantText}>Variant: {item.itemData.versionName}</div>}
                      
                      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                        {item.licenseKey && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.75rem', color: textMuted, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                              LICENSE KEY
                            </div>
                            <div 
                              onClick={() => {
                                navigator.clipboard.writeText(item.licenseKey);
                                setCopiedKeyId(item.licenseKey);
                                setTimeout(() => setCopiedKeyId(null), 2000);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              }}
                              title="Click to copy license key"
                            >
                              <span style={{ 
                                fontFamily: 'monospace', 
                                fontWeight: 800, 
                                fontSize: '0.95rem', 
                                letterSpacing: '0.08em',
                                color: '#111827',
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                {item.licenseKey}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: copiedKeyId === item.licenseKey ? '#059669' : '#6B7280' }}>
                                {copiedKeyId === item.licenseKey ? (
                                  '✓ Copied'
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                )}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '5px', paddingLeft: '2px' }}>
                              Registered Email: <strong style={{ color: '#111' }}>{user.email}</strong>
                            </div>
                          </div>
                        )}

                        {/* Status & Payment Date Box */}
                        <div style={{ background: '#F9FAFB', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6B7280', fontWeight: 500 }}>Status</span>
                            <span style={{ 
                              fontWeight: 800, 
                              color: item.status === 'active' ? '#059669' : '#DC2626',
                              background: item.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.status === 'active' ? '#10B981' : '#EF4444' }}></span>
                              {item.status === 'active' ? 'ACTIVE' : (item.status === 'expired' ? 'EXPIRED' : item.status.toUpperCase())}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#6B7280', fontWeight: 500 }}>Last Payment Date</span>
                            <span style={{ color: '#111827', fontWeight: 700 }}>
                              {item.lastRenewedAt ? new Date(item.lastRenewedAt.seconds ? item.lastRenewedAt.seconds * 1000 : item.lastRenewedAt).toLocaleDateString() : (item.date ? new Date(item.date.seconds ? item.date.seconds * 1000 : item.date).toLocaleDateString() : 'N/A')}
                            </span>
                          </div>

                          {item.expiresAt && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#6B7280', fontWeight: 500 }}>{item.status === 'active' ? 'Next Renewal Date' : 'Access Expired On'}</span>
                              <span style={{ color: item.status === 'active' ? '#0071E3' : '#DC2626', fontWeight: 700 }}>
                                {new Date(item.expiresAt.seconds ? item.expiresAt.seconds * 1000 : item.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {downloadUrl && item.status === 'active' ? (
                          <QuickReview
                            productId={item.itemData.id}
                            productName={item.itemData.name}
                            userId={user.uid}
                            userDisplayName={user.displayName || 'Anonymous'}
                            userPhoto={user.photoURL || ''}
                            downloadUrl={downloadUrl}
                            buttonText="Download Asset"
                          />
                        ) : (
                           item.status !== 'active' ? (
                             <button onClick={() => handleRenewSubscription(item)} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: '12px', cursor: 'pointer' }}>
                               🔄 Renew Subscription
                             </button>
                           ) : (
                             <button style={{ width: '100%', opacity: 0.5, padding: '12px', borderRadius: '12px', background: '#F3F4F6', color: '#9CA3AF', border: 'none' }} disabled>Pending Setup</button>
                           )
                        )}

                        {item.isSubscription && item.subscriptionId && item.status === 'active' && (
                           <button onClick={() => handleManageClick(item)} className="btn-secondary" style={{ width: '100%', marginTop: '10px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
                             Manage Subscription
                           </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
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

      {/* Manage Subscription Modal */}
      {manageSubItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setManageSubItem(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', background: 'var(--bg-card)', borderRadius: '12px', border: `1px solid ${borderColor}`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                 <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>Manage Subscription</h2>
                 <div style={{ color: textMuted, fontSize: '0.875rem' }}>{manageSubItem.itemData.name}</div>
               </div>
               <button onClick={() => setManageSubItem(null)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>

            {subLoading && !subData ? (
               <div style={{ padding: '48px 0', textAlign: 'center', color: textMuted }}>Loading details from Razorpay...</div>
            ) : subData ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 
                 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                       <span style={{ color: textMuted, fontSize: '0.875rem' }}>Status</span>
                       <span style={{ 
                         color: subData.status === 'active' ? 'var(--success)' : (subData.status === 'cancelled' ? 'var(--danger)' : '#F59E0B'),
                         fontWeight: 600, textTransform: 'capitalize' 
                       }}>
                         {subData.status} {manageSubItem.pendingCancellation || subData.cancel_at_cycle_end ? '(Cancels at cycle end)' : ''}
                       </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                       <span style={{ color: textMuted, fontSize: '0.875rem' }}>Payments Made</span>
                       <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{subData.paid_count}</span>
                    </div>
                    {subData.charge_at && subData.status === 'active' && !manageSubItem.pendingCancellation && !subData.cancel_at_cycle_end && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span style={{ color: textMuted, fontSize: '0.875rem' }}>Next Payment</span>
                         <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                           {new Date(subData.charge_at * 1000).toLocaleDateString()}
                         </span>
                      </div>
                    )}
                    {subData.current_end && (manageSubItem.pendingCancellation || subData.cancel_at_cycle_end || subData.status === 'cancelled') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span style={{ color: textMuted, fontSize: '0.875rem' }}>Access Ends On</span>
                         <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                           {new Date(subData.current_end * 1000).toLocaleDateString()}
                         </span>
                      </div>
                    )}
                 </div>

                 {subData.status === 'active' && !manageSubItem.pendingCancellation && !subData.cancel_at_cycle_end && cancelStatus === 'idle' && (
                   <button 
                     className="btn-secondary" 
                     onClick={() => setCancelStatus('confirm')}
                     style={{ width: '100%', padding: '12px', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)', marginTop: '8px' }}
                   >
                     Cancel Subscription
                   </button>
                 )}

                 {cancelStatus === 'confirm' && (
                   <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                     <h4 style={{ color: '#F87171', margin: '0 0 8px 0', fontSize: '0.875rem' }}>Are you sure?</h4>
                     <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                       You will retain access to your license key until the end of your current billing cycle. After that, your auto-pay mandate will be permanently revoked and your key will be deactivated.
                     </p>
                     <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                       <button onClick={() => setCancelStatus('idle')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Go Back</button>
                       <button onClick={handleCancelSubscription} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem', background: '#DC2626', borderColor: '#DC2626' }}>Yes, Cancel it</button>
                     </div>
                   </div>
                 )}

                 {cancelStatus === 'cancelling' && (
                   <div style={{ textAlign: 'center', padding: '16px', color: textMuted, fontSize: '0.875rem' }}>
                     Processing cancellation with Razorpay...
                   </div>
                 )}

                 {cancelStatus === 'error' && (
                   <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                     <p style={{ color: '#F87171', fontSize: '0.875rem', margin: 0 }}>{cancelError}</p>
                     <button onClick={() => setCancelStatus('idle')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '12px' }}>Try Again</button>
                   </div>
                 )}

                 {cancelStatus === 'success' && (
                   <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                     <h4 style={{ color: 'var(--success)', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Successfully Cancelled ✓</h4>
                     <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>
                       Your subscription will not renew. Your license remains active until the cycle ends.
                     </p>
                     <button onClick={() => setManageSubItem(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem', marginTop: '16px', width: '100%' }}>Close Window</button>
                   </div>
                 )}

                 {(subData.status === 'cancelled' || manageSubItem.pendingCancellation || subData.cancel_at_cycle_end) && cancelStatus !== 'success' && (
                   <div style={{ fontSize: '0.875rem', color: textMuted, textAlign: 'center', marginTop: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                     This subscription is cancelled. You will retain access until the end of your billing cycle.
                   </div>
                 )}

               </div>
            ) : (
               <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--danger)' }}>Could not load subscription details.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
