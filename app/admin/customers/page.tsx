'use client';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';

export default function CustomersListPage() {
  const router = useRouter();
  const { customers: unsortedCustomers } = useAdmin();
  
  // Sort customers by lastOrderDate desc
  const customers = [...unsortedCustomers].sort((a, b) => (b.lastOrderDate?.seconds || 0) - (a.lastOrderDate?.seconds || 0));

  const panelBg = 'var(--bg-card)';
  const borderColor = 'var(--border-subtle)';
  const textMuted = 'var(--text-muted)';

  return (
    <div style={{ minHeight: '100vh', margin: '-32px', padding: '32px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Customers</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⤓ Export
          </button>
          <button className="btn-primary" style={{ padding: '8px 16px' }}>
            + Add customer
          </button>
        </div>
      </div>

      {/* Filters (Mock) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ color: '#3B82F6', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', borderBottom: '2px solid #3B82F6', paddingBottom: '4px' }}>All ({customers.length})</div>
        <div style={{ color: textMuted, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}>New (0)</div>
        <div style={{ color: textMuted, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}>Abandoned checkouts (0)</div>
        <div style={{ color: textMuted, fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer' }}>Email subscribers (0)</div>
      </div>

      {/* Table */}
      <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Customer</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Email</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'center' }}>Orders</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Total Spent</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>City</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Last Seen</th>
              <th style={{ padding: '16px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', textAlign: 'right' }}>Last Order</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: textMuted }}>No customers found.</td></tr>
            ) : (
              customers.map((c, i) => (
                <tr 
                  key={c.id} 
                  style={{ borderBottom: i === customers.length - 1 ? 'none' : `1px solid ${borderColor}`, cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.email)}`)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: 500, color: '#E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                        {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      {c.name || 'Unknown'}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#3B82F6' }}>{c.email}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>{c.ordersCount || 0}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#E5E7EB' }}>${Number(c.totalSpent || 0).toFixed(2)}</td>
                  <td style={{ padding: '16px', color: textMuted }}>{c.city || 'Unknown'}</td>
                  <td style={{ padding: '16px', textAlign: 'right', color: textMuted }}>
                    {c.lastSeen ? new Date(c.lastSeen.seconds * 1000).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', color: textMuted }}>
                    {c.lastOrderDate ? new Date(c.lastOrderDate.seconds * 1000).toLocaleDateString() : 'Never'}
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
