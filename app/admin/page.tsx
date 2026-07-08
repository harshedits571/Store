'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../context/AdminContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { leads, initialLoading: loading } = useAdmin();
  
  // Calculate Stats synchronously
  let totalOrders = 0;
  let totalSales = 0;
  let newCustomers = 0;
  const uniqueEmails = new Set();
  
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const dailyData: Record<string, number> = {};
  for(let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyData[dateStr] = 0;
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
        dailyData[dateStr] += Number(lead.amount) || 0;
      }
    }
  });

  newCustomers = uniqueEmails.size;
  const chartData = Object.keys(dailyData).map(date => ({
    date,
    revenue: dailyData[date]
  }));
  const recentOrders = leads.slice(0, 10);


  // Placeholder for second chart
  const retentionData = [
    { name: 'Feb', rate: 40 }, { name: 'Mar', rate: 75 }, { name: 'Apr', rate: 55 },
    { name: 'May', rate: 78 }, { name: 'Jun', rate: 60 }, { name: 'Jul', rate: 20 },
    { name: 'Aug', rate: 58 }, { name: 'Sep', rate: 40 }, { name: 'Oct', rate: 60 },
    { name: 'Nov', rate: 20 }
  ];

  const dashboardBg = 'var(--bg-primary)';
  const cardBg = 'var(--bg-card)';
  const textMuted = 'var(--text-muted)';
  const borderColor = 'var(--border-subtle)';

  return (
    <div style={{ background: dashboardBg, color: 'var(--text-primary)', padding: '32px', minHeight: '100vh', margin: '-32px', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Ecommerce Dashboard</h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.875rem' }}>Here's what's going on at your business right now</p>
        </div>

        {/* Top Metrics Row */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div className="premium-card" style={{ padding: '16px 24px', minWidth: '150px' }}>
            <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Orders</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '...' : totalOrders}</div>
            <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '4px' }}>Last 7 days</div>
          </div>
          <div className="premium-card" style={{ padding: '16px 24px', minWidth: '150px' }}>
            <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>New Customers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{loading ? '...' : newCustomers}</div>
            <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '4px' }}>Last 7 days</div>
          </div>
          <div className="premium-card" style={{ padding: '16px 24px', minWidth: '150px' }}>
            <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${loading ? '...' : totalSales.toFixed(2)}</div>
            <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '4px' }}>Last 7 days</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Sales Chart */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 4px 0', position: 'relative', zIndex: 2 }}>Sales vs actual</h3>
          <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 24px 0', position: 'relative', zIndex: 2 }}>Actual earnings in the last 7 days</p>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" stroke={textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={textMuted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retention Chart */}
        <div className="premium-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 4px 0', position: 'relative', zIndex: 2 }}>Customer Retention</h3>
          <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 24px 0', position: 'relative', zIndex: 2 }}>Retention rate over last 6 months</p>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke={textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={textMuted} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="rate" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4, fill: '#8B5CF6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div style={{ background: cardBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
        <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Recent Payment Activity</h3>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Product</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Customer</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Time</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: textMuted }}>Loading data...</td></tr>
            ) : recentOrders.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: textMuted }}>No recent orders.</td></tr>
            ) : (
              recentOrders.map((order, i) => (
                <tr key={order.id} style={{ borderBottom: i === recentOrders.length - 1 ? 'none' : `1px solid ${borderColor}` }}>
                  <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {order.items && order.items.length > 0 
                      ? order.items.length === 1 ? order.items[0].name : `${order.items.length} Items Purchased`
                      : order.productId || 'Unknown Product'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div 
                      onClick={() => router.push(`/admin/customers/${encodeURIComponent(order.email)}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.75rem' }}>
                        {order.name ? order.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div style={{ color: '#3B82F6', fontWeight: 500 }}>{order.name || 'Customer'}</div>
                        <div style={{ color: textMuted, fontSize: '0.75rem' }}>{order.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: textMuted }}>
                    {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      background: order.status === 'verified' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                      color: order.status === 'verified' ? '#34D399' : '#F87171',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {order.status || 'Success'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {order.currency === 'INR' ? `₹${Number(order.amount).toFixed(2)}` : `$${Number(order.amount).toFixed(2)}`}
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
