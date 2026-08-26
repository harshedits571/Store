'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';

export default function CustomersListPage() {
  const router = useRouter();
  const { customers: unsortedCustomers } = useAdmin();

  // Filters State
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [limitFilter, setLimitFilter] = useState<number | 'all'>(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'spent_desc' | 'orders_desc' | 'name_asc'>('recent');

  const textMuted = 'var(--text-muted)';

  // Helper: check timestamp range (bulletproof calendar matching)
  const isDateInRange = (val: any, range: 'today' | 'yesterday' | 'week' | 'month') => {
    if (!val) return false;
    let itemMs = 0;
    if (typeof val.toMillis === 'function') itemMs = val.toMillis();
    else if (typeof val.toDate === 'function') itemMs = val.toDate().getTime();
    else if (typeof val.seconds === 'number') itemMs = val.seconds * 1000;
    else if (val._seconds) itemMs = val._seconds * 1000;
    else if (typeof val === 'number') itemMs = val > 1e11 ? val : val * 1000;
    else if (typeof val === 'string') itemMs = new Date(val).getTime();

    if (!itemMs || isNaN(itemMs)) return false;

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

  // Filtered and sorted customers list
  const filteredCustomers = useMemo(() => {
    let list = [...unsortedCustomers];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        (c.name || '').toLowerCase().includes(q) || 
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }

    // Time filter (based on lastOrderDate or createdAt or lastSeen)
    if (timeFilter !== 'all') {
      list = list.filter(c => {
        const sec = c.lastOrderDate?.seconds || c.createdAt?.seconds || c.lastSeen?.seconds;
        return isDateInRange(sec, timeFilter);
      });
    }

    // Sort order
    if (sortOrder === 'recent') {
      list.sort((a, b) => (b.lastOrderDate?.seconds || b.createdAt?.seconds || 0) - (a.lastOrderDate?.seconds || a.createdAt?.seconds || 0));
    } else if (sortOrder === 'spent_desc') {
      list.sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0));
    } else if (sortOrder === 'orders_desc') {
      list.sort((a, b) => (Number(b.ordersCount) || 0) - (Number(a.ordersCount) || 0));
    } else if (sortOrder === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Limit filter
    if (limitFilter !== 'all') {
      list = list.slice(0, Number(limitFilter));
    }

    return list;
  }, [unsortedCustomers, timeFilter, limitFilter, searchQuery, sortOrder]);

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Customers Hub
          </h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.88rem' }}>
            Manage customer profiles, Google avatars, and lifetime store spending.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(0, 113, 227, 0.1)', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
            Showing {filteredCustomers.length} of {unsortedCustomers.length} Customers
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
        {/* Search & Limit Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '0.9rem' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by customer name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
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

          {/* Limit Filter Selector (25, 50, 100, All) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>
              Show:
            </span>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              {[25, 50, 100, 'all'].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setLimitFilter(val as any)}
                  style={{
                    padding: '4px 12px',
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

        {/* Time Period Filter Pills */}
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

      {/* Customers Table */}
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
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Customer</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Email</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'center' }}>Orders</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Total Spent</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>City</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Last Seen</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Last Order</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No customers found matching your filter criteria.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try switching to "All Time" or clearing your search keywords.</div>
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c, i) => {
                const avatarSrc = c.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(c.name || c.email || 'Customer')}&scale=110`;

                return (
                  <tr 
                    key={c.id || c.email || i} 
                    style={{ borderBottom: i === filteredCustomers.length - 1 ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                    onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.email)}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0071e3, #6366f1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(0, 113, 227, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <img
                            src={avatarSrc}
                            alt={c.name || 'Customer'}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              // If image fails, fallback to initial
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ lineHeight: 1.2, fontWeight: 700 }}>{c.name || 'Customer'}</div>
                          <div style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 400, marginTop: '2px' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 24px', color: 'var(--accent-primary)', fontWeight: 500 }}>{c.email}</td>
                    <td style={{ padding: '14px 24px', textAlign: 'center', fontWeight: 600 }}>{c.ordersCount || 0}</td>
                    <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{Number(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 24px', color: textMuted }}>{c.city || 'Unknown'}</td>
                    <td style={{ padding: '14px 24px', textAlign: 'right', color: textMuted, fontSize: '0.8rem' }}>
                      {c.lastSeen ? new Date(c.lastSeen.seconds * 1000).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right', color: textMuted, fontSize: '0.8rem' }}>
                      {c.lastOrderDate ? new Date(c.lastOrderDate.seconds * 1000).toLocaleDateString() : 'Never'}
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
