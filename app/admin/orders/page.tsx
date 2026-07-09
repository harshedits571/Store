'use client';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';

export default function OrdersPage() {
  const router = useRouter();
  const { leads: orders } = useAdmin();

  return (
    <div>
      <h1 className="h2 mb-4">Leads & Orders</h1>
      <p className="text-secondary" style={{ marginBottom: '32px' }}>Track customer purchases and leads.</p>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Order ID</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Customer</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Items</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center' }}>No orders found yet.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 500, fontFamily: 'monospace' }}>{order.id.slice(0, 8)}</td>
                  <td style={{ padding: '16px' }}>
                    <div 
                      onClick={() => router.push(`/admin/customers/${encodeURIComponent(order.email)}`)}
                      style={{ cursor: 'pointer', color: '#3B82F6', fontWeight: 500 }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {order.name || order.email}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.items ? order.items.map((i: any) => i.isBundleItem ? `↳ ${i.name}` : i.name).join(', ') : 'Unknown Items'}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>
                    {order.currency === 'INR' ? `₹${order.amount?.toFixed(2)}` : `$${order.amount?.toFixed(2)}`}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      background: order.status === 'verified' ? 'rgba(16, 185, 129, 0.1)' : 
                                  order.status === 'interested' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: order.status === 'verified' ? 'var(--success)' : 
                             order.status === 'interested' ? '#ec4899' : 'var(--warning)',
                      padding: '4px 12px', 
                      borderRadius: '100px', 
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {order.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
