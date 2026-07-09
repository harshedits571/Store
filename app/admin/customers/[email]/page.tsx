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
  const [loading, setLoading] = useState(true);
  
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
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {customer.name?.charAt(0).toUpperCase()}
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
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Fulfilment Status</th>
                  <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: textMuted }}>No orders found.</td></tr>
                ) : (
                  orders.map((order, i) => (
                    <tr key={order.id} style={{ borderBottom: i === orders.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                      <td style={{ padding: '16px 24px', color: '#3B82F6' }}>#{order.id.substring(0, 6)}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 500, color: '#E5E7EB' }}>
                        {order.currency === 'INR' ? '₹' : '$'}{Number(order.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34D399', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          PAID ✓
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34D399', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          FULFILLED ✓
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: textMuted }}>
                        {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : ''}
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
