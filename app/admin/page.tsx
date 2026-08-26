'use client';

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../context/AdminContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { leads, customers, initialLoading: loading } = useAdmin();
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Table Filters State
  const [orderTimeFilter, setOrderTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [orderLimitFilter, setOrderLimitFilter] = useState<number | 'all'>(25);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'verified' | 'interested'>('all');

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const res = await fetch('/api/track-visitor');
        if (res.ok) {
          const data = await res.json();
          setVisitorCount(data.count ?? 0);
        } else {
          setVisitorCount(0);
        }
      } catch (err) {
        console.error(err);
        setVisitorCount(0);
      }
    };
    fetchVisitors();
  }, []);
  
  // Calculate Stats synchronously
  let totalOrders = 0;
  let totalSales = 0;
  let newCustomers = 0;
  const uniqueEmails = new Set();
  
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const dailyData: Record<string, { revenue: number, orders: number }> = {};
  for(let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyData[dateStr] = { revenue: 0, orders: 0 };
  }

  leads.forEach(lead => {
    if (!lead.createdAt) return;
    const leadDate = new Date(lead.createdAt.seconds * 1000);
    
    if (leadDate >= sevenDaysAgo) {
      totalOrders++;
      totalSales += Number(lead.amount) || 0;
      if (lead.email) uniqueEmails.add(lead.email);
      
      const dateStr = leadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr].revenue += Number(lead.amount) || 0;
        dailyData[dateStr].orders += 1;
      }
    }
  });

  newCustomers = uniqueEmails.size;
  const chartData = Object.keys(dailyData).map(date => ({
    date,
    revenue: dailyData[date].revenue,
    orders: dailyData[date].orders
  }));

  // Calculate Customer Retention for the last 6 months
  const retentionData: any[] = [];
  
  const monthLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth()
    });
  }

  const firstPurchaseDate: Record<string, Date> = {};
  leads.forEach(lead => {
    if (!lead.email || !lead.createdAt) return;
    const date = new Date(lead.createdAt.seconds * 1000);
    if (!firstPurchaseDate[lead.email] || date < firstPurchaseDate[lead.email]) {
      firstPurchaseDate[lead.email] = date;
    }
  });

  monthLabels.forEach(({ label, year, month }) => {
    let totalCustomersThisMonth = 0;
    let returningCustomersThisMonth = 0;
    
    const customersThisMonth = new Set<string>();
    
    leads.forEach(lead => {
      if (!lead.email || !lead.createdAt) return;
      const date = new Date(lead.createdAt.seconds * 1000);
      if (date.getFullYear() === year && date.getMonth() === month) {
        customersThisMonth.add(lead.email);
      }
    });

    customersThisMonth.forEach(email => {
      totalCustomersThisMonth++;
      const firstDate = firstPurchaseDate[email];
      if (firstDate && (firstDate.getFullYear() < year || (firstDate.getFullYear() === year && firstDate.getMonth() < month))) {
        returningCustomersThisMonth++;
      }
    });

    const rate = totalCustomersThisMonth > 0 
      ? Math.round((returningCustomersThisMonth / totalCustomersThisMonth) * 100) 
      : 0;

    retentionData.push({
      name: label,
      rate
    });
  });

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

  // Filtered orders for Recent Activity Table
  const filteredRecentOrders = (() => {
    let list = [...leads];

    // Search filter
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase().trim();
      list = list.filter(o => 
        (o.name || '').toLowerCase().includes(q) || 
        (o.email || '').toLowerCase().includes(q) ||
        (o.productId || '').toLowerCase().includes(q) ||
        (o.items && o.items.some((it: any) => (it.name || '').toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (orderStatusFilter !== 'all') {
      list = list.filter(o => (o.status || 'verified') === orderStatusFilter);
    }

    // Time filter
    if (orderTimeFilter !== 'all') {
      list = list.filter(o => isOrderInDateRange(o, orderTimeFilter));
    }

    // Limit filter
    if (orderLimitFilter !== 'all') {
      list = list.slice(0, Number(orderLimitFilter));
    }

    return list;
  })();

  const textMuted = 'var(--text-muted)';

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      
      {/* Header & Metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.03em' }}>Ecommerce Dashboard</h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.875rem' }}>Real-time business performance and sales analytics.</p>
        </div>

        {/* Top Metrics Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Visitors Card */}
          <div style={{ 
            padding: '20px 24px', 
            minWidth: '165px', 
            borderRadius: '18px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Visitors</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(0, 113, 227, 0.08)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{visitorCount === null ? '...' : visitorCount.toLocaleString()}</div>
            <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>All Time</span>
            </div>
          </div>

          {/* Orders Card */}
          <div style={{ 
            padding: '20px 24px', 
            minWidth: '165px', 
            borderRadius: '18px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Orders</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(52, 211, 153, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{loading ? '...' : totalOrders}</div>
            <div style={{ color: '#10B981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 600 }}>Last 7 days</div>
          </div>

          {/* Revenue Card */}
          <div style={{ 
            padding: '20px 24px', 
            minWidth: '175px', 
            borderRadius: '18px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Revenue</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {loading ? '...' : `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
            </div>
            <div style={{ color: '#10B981', fontSize: '0.75rem', marginTop: '6px', fontWeight: 600 }}>Last 7 days</div>
          </div>

          {/* Customers Card */}
          <div style={{ 
            padding: '20px 24px', 
            minWidth: '165px', 
            borderRadius: '18px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Customers</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{loading ? '...' : newCustomers}</div>
            <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '6px' }}>Last 7 days</div>
          </div>

        </div>
      </div>

      {/* Analytics Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Sales & Orders Trend */}
        <div style={{ 
          background: 'var(--bg-card)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-subtle)', 
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>Sales & Orders Trend</h3>
              <p style={{ color: textMuted, fontSize: '0.8125rem', margin: 0 }}>Daily revenue vs order volume (Last 7 days)</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0071E3' }}></span> Revenue
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span> Orders
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071E3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0071E3" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                <XAxis dataKey="date" stroke={textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke={textMuted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke={textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', borderRadius: '12px', fontSize: '0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  formatter={(value: any, name: any) => [name === 'revenue' ? `₹${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#0071E3" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#ordersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Retention */}
        <div style={{ 
          background: 'var(--bg-card)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-subtle)', 
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>Customer Retention</h3>
              <p style={{ color: textMuted, fontSize: '0.8125rem', margin: 0 }}>Repeat customer percentage over last 6 months</p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 10px', borderRadius: '100px' }}>
              6 Months
            </span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
                <XAxis dataKey="name" stroke={textMuted} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={textMuted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', borderRadius: '12px', fontSize: '0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Retention Rate']}
                />
                <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Table with Date & Limit Filters */}
      <div style={{ 
        background: 'var(--bg-card)', 
        borderRadius: '20px', 
        border: '1px solid var(--border-subtle)', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Table Header & Controls */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 2px 0', letterSpacing: '-0.01em' }}>
                Recent Payment Activity
              </h3>
              <span style={{ fontSize: '0.78rem', color: textMuted }}>
                Showing {filteredRecentOrders.length} of {leads.length} recorded payments & leads
              </span>
            </div>

            {/* Limit Selector (10, 25, 50, 100, All) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>
                SHOW:
              </span>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                {[10, 25, 50, 100, 'all'].map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setOrderLimitFilter(val as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: orderLimitFilter === val ? 'var(--text-primary)' : 'transparent',
                      color: orderLimitFilter === val ? 'var(--bg-primary)' : 'var(--text-secondary)',
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

          {/* Search and Date Filter Pills (English Only) */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '0.85rem' }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search order, customer name, email..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {orderSearch && (
                <button
                  onClick={() => setOrderSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: textMuted,
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Date Filter Pills (English Only) */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: '📅 Today' },
                { id: 'yesterday', label: '⏪ Yesterday' },
                { id: 'week', label: '⚡ Last 7 Days' },
                { id: 'month', label: '🗓️ This Month' },
              ].map((tab) => {
                const isActive = orderTimeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderTimeFilter(tab.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '100px',
                      border: isActive ? '1px solid rgba(0, 113, 227, 0.4)' : '1px solid var(--border-subtle)',
                      background: isActive ? 'rgba(0, 113, 227, 0.12)' : 'var(--bg-secondary)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.78rem',
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

        </div>
        
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '14px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Product</th>
                <th style={{ padding: '14px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Customer</th>
                <th style={{ padding: '14px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Time</th>
                <th style={{ padding: '14px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '14px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '28px', textAlign: 'center', color: textMuted }}>Loading activity...</td></tr>
              ) : filteredRecentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: textMuted }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔍</div>
                    <div style={{ fontWeight: 600 }}>No orders found for this date/search filter.</div>
                  </td>
                </tr>
              ) : (
                filteredRecentOrders.map((order, i) => {
                  const matchedCustomer = customers?.find((c: any) => c.email?.toLowerCase() === order.email?.toLowerCase());
                  const avatarPhoto = order.photoURL || matchedCustomer?.photoURL;
                  const avatarSrc = avatarPhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(order.name || order.email || 'Customer')}&scale=110`;

                  return (
                    <tr key={order.id || i} style={{ borderBottom: i === filteredRecentOrders.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {order.items && order.items.length > 0 
                          ? order.items.length === 1 ? order.items[0].name : `${order.items.length} Items Purchased`
                          : order.productId || 'Unknown Product'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div 
                          onClick={() => router.push(`/admin/customers/${encodeURIComponent(order.email)}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
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
                      <td style={{ padding: '16px 24px', color: textMuted, fontSize: '0.82rem' }}>
                        {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          background: order.status === 'verified' || !order.status ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                          color: order.status === 'verified' || !order.status ? '#10B981' : '#EF4444',
                          border: order.status === 'verified' || !order.status ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {order.status || 'VERIFIED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right' }}>
                        ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
