'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';

export default function OrdersPage() {
  const router = useRouter();
  const { leads: unsortedOrders, customers } = useAdmin();

  // Filters State
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [limitFilter, setLimitFilter] = useState<number | 'all'>(50);
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'interested'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const textMuted = 'var(--text-muted)';

  // Helper to extract timestamp ms
  const getTimestampMs = (item: any): number => {
    if (!item) return 0;
    const val = item.createdAt || item.date || item.lastOrderDate || item.lastSeen;
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
    if (val._seconds) return val._seconds * 1000;
    if (typeof val === 'number') return val > 1e11 ? val : val * 1000;
    if (typeof val === 'string') {
      const parsed = new Date(val).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  // Helper to check date in range (bulletproof calendar matching)
  const isOrderInDateRange = (item: any, range: 'today' | 'yesterday' | 'week' | 'month'): boolean => {
    const itemMs = getTimestampMs(item);
    if (!itemMs) return false;

    const itemDate = new Date(itemMs);
    const now = new Date();

    const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const itemYMD = toYMD(itemDate);
    const todayYMD = toYMD(now);

    const yDate = new Date(now);
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayYMD = toYMD(yDate);

    if (range === 'today') return itemYMD === todayYMD;
    if (range === 'yesterday') return itemYMD === yesterdayYMD;
    if (range === 'week') return itemMs >= (now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === 'month') return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    return true;
  };

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let list = [...unsortedOrders];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => 
        (o.id || '').toLowerCase().includes(q) ||
        (o.name || '').toLowerCase().includes(q) || 
        (o.email || '').toLowerCase().includes(q) ||
        (o.productId || '').toLowerCase().includes(q) ||
        (o.items && o.items.some((it: any) => (it.name || '').toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(o => (o.status || 'verified') === statusFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      list = list.filter(o => isOrderInDateRange(o, timeFilter));
    }

    // Limit filter
    if (limitFilter !== 'all') {
      list = list.slice(0, Number(limitFilter));
    }

    return list;
  }, [unsortedOrders, timeFilter, limitFilter, statusFilter, searchQuery]);

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Leads & Orders
          </h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.88rem' }}>
            Track all customer transactions, checkout leads, and verified licenses.
          </p>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(0, 113, 227, 0.1)', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
            Showing {filteredOrders.length} of {unsortedOrders.length} Orders
          </span>
        </div>
      </div>

      {/* Control Bar: Time Filters, Limit Filter & Search */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '18px 22px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Search, Status & Limit Row (3-Column Dead Center Grid) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1fr) auto minmax(240px, 1fr)',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Search Box (Left) */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px', justifySelf: 'start' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '0.85rem' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by Order ID, name, email, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs (Exact Dead Center) */}
          <div style={{
            display: 'flex',
            gap: '6px',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            justifySelf: 'center'
          }}>
            {[
              { id: 'all', label: 'All Status' },
              { id: 'verified', label: '✓ Verified' },
              { id: 'interested', label: '⏳ Leads' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--text-primary)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Limit Selector (Right) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'end' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>
              SHOW:
            </span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              {[10, 25, 50, 100, 'all'].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setLimitFilter(val as any)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: limitFilter === val ? 'var(--text-primary)' : 'transparent',
                    color: limitFilter === val ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {val === 'all' ? 'All' : `${val}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Filter Pills (English Only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', marginRight: '4px' }}>
            Date Filter:
          </span>

          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: '📅 Today' },
            { id: 'yesterday', label: '⏪ Yesterday' },
            { id: 'week', label: '⚡ Last 7 Days' },
            { id: 'month', label: '🗓️ This Month' },
          ].map((tab) => {
            const isActive = timeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTimeFilter(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: isActive ? '1px solid rgba(0, 113, 227, 0.4)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'rgba(0, 113, 227, 0.12)' : 'var(--bg-secondary)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ 
        background: 'var(--bg-card)', 
        borderRadius: '20px', 
        border: '1px solid var(--border-subtle)', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Order ID</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Customer</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Items</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Time</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No orders found matching your filter criteria.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try switching to "All Time" or clearing your search query.</div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, i) => {
                const matchedCustomer = customers?.find((c: any) => c.email?.toLowerCase() === order.email?.toLowerCase());
                const avatarPhoto = order.photoURL || matchedCustomer?.photoURL;
                const avatarSrc = avatarPhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(order.name || order.email || 'Customer')}&scale=110`;

                return (
                  <tr key={order.id || i} style={{ borderBottom: i === filteredOrders.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 700, fontFamily: 'monospace', color: '#0071e3' }}>
                      #{order.id ? order.id.slice(0, 8) : 'ORD'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div 
                        onClick={() => router.push(`/admin/customers/${encodeURIComponent(order.email)}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      >
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0071e3, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0, 113, 227, 0.2)'
                        }}>
                          <img
                            src={avatarSrc}
                            alt={order.name || 'Customer'}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ color: 'var(--accent-primary)', fontWeight: 700, lineHeight: 1.2 }}>{order.name || 'Customer'}</div>
                          <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '2px' }}>{order.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.items ? order.items.map((it: any) => it.isBundleItem ? `↳ ${it.name}` : it.name).join(', ') : (order.productId || 'Unknown Items')}
                    </td>
                    <td style={{ padding: '16px 24px', color: textMuted, fontSize: '0.82rem' }}>
                      {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>
                      ₹{Number(order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <span style={{ 
                        background: order.status === 'verified' || !order.status ? 'rgba(52, 211, 153, 0.12)' : 
                                    order.status === 'interested' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: order.status === 'verified' || !order.status ? '#10B981' : 
                               order.status === 'interested' ? '#ec4899' : '#f59e0b',
                        border: order.status === 'verified' || !order.status ? '1px solid rgba(16, 185, 129, 0.25)' : 
                                order.status === 'interested' ? '1px solid rgba(236, 72, 153, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                        padding: '4px 12px', 
                        borderRadius: '99px', 
                        fontSize: '0.725rem', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {order.status || 'VERIFIED'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
