'use client';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '../../context/AdminContext';
import React, { useState, useMemo } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Returns a human-readable relative time string and whether device is "active" (seen within 10 min) */
function deviceLastSeen(lastSeen?: string): { label: string; isActive: boolean } {
  if (!lastSeen) return { label: 'Never', isActive: false };
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const isActive = diffMin < 10;
  if (diffMin < 1) return { label: 'Just now', isActive };
  if (diffMin < 60) return { label: `${diffMin}m ago`, isActive };
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return { label: `${diffHr}h ago`, isActive };
  const diffDay = Math.floor(diffHr / 24);
  return { label: `${diffDay}d ago`, isActive: false };
}

export default function LicensesPage() {
  const { licenses } = useAdmin();

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // ─── Derived: unique product names ─────────────────────────────────────────
  const productOptions = useMemo(() => {
    const names = new Set<string>();
    licenses.forEach((l) => {
      const name = l.productName || l.productId || 'Unknown';
      names.add(name);
    });
    return Array.from(names).sort();
  }, [licenses]);

  // ─── Filtered + Sorted Licenses ────────────────────────────────────────────
  const filteredLicenses = useMemo(() => {
    return [...licenses]
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .filter((lic) => {
        const emailMatch = !searchEmail || (lic.email || '').toLowerCase().includes(searchEmail.toLowerCase());
        const productName = lic.productName || lic.productId || 'Unknown';
        const productMatch = selectedProduct === 'all' || productName === selectedProduct;
        const statusMatch = selectedStatus === 'all' || lic.status === selectedStatus;
        return emailMatch && productMatch && statusMatch;
      });
  }, [licenses, searchEmail, selectedProduct, selectedStatus]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleResetHardware = async (id: string) => {
    if (confirm('Reset hardware binding for this license?')) {
      try {
        await fetch('/api/admin/manage-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseId: id, action: 'reset' }),
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleRemoveDevice = async (licId: string, devId: string) => {
    if (confirm('Deactivate and logout this device remotely?')) {
      try {
        await fetch('/api/admin/manage-license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseId: licId, action: 'remove_device', deviceId: devId }),
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleBlock = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'block' : 'unblock';
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await fetch('/api/admin/manage-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId: id, action, newStatus }),
      });
    } catch (e) { console.error(e); }
  };

  // ─── Grant Free Access Modal ────────────────────────────────────────────────
  const [grantItem, setGrantItem] = useState<any>(null);
  const [grantDuration, setGrantDuration] = useState<string>('30');
  const [customDays, setCustomDays] = useState<string>('30');
  const [granting, setGranting] = useState(false);

  const handleGrantAccessSubmit = async () => {
    if (!grantItem) return;
    setGranting(true);
    const finalDays = grantDuration === 'custom' ? customDays : grantDuration;
    try {
      await fetch('/api/admin/manage-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId: grantItem.id, action: 'grant_access', durationDays: finalDays }),
      });
      alert(`Free access granted successfully (${finalDays === 'permanent' ? 'Permanent Lifetime' : finalDays + ' Days'})!`);
      setGrantItem(null);
    } catch (e) {
      console.error(e);
      alert('Error granting free access.');
    }
    setGranting(false);
  };

  // ─── Subscription Modal ─────────────────────────────────────────────────────
  const [manageSubItem, setManageSubItem] = useState<any>(null);
  const [subData, setSubData] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<'idle' | 'confirm' | 'cancelling' | 'success' | 'error'>('idle');
  const [cancelError, setCancelError] = useState('');

  const handleManageClick = async (lic: any) => {
    setManageSubItem(lic);
    setSubData(null);
    setSubLoading(true);
    setCancelStatus('idle');
    setCancelError('');
    try {
      const res = await fetch(`/api/subscription/${lic.subscriptionId}`);
      if (res.ok) { const data = await res.json(); setSubData(data.subscription); }
    } catch (e) { console.error(e); }
    setSubLoading(false);
  };

  const handleCancelSubscription = async () => {
    setCancelStatus('cancelling');
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: manageSubItem.subscriptionId, licenseKey: manageSubItem.licenseKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubData(data.subscription);
        setCancelStatus('success');
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

  // ─── Shared Input Style ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(0,0,0,0.1)',
    background: '#fff',
    color: '#111',
    fontSize: '0.875rem',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    fontFamily: 'inherit',
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="h2 mb-4">Manage Licenses (DRM)</h1>
        <p className="text-secondary">View generated keys, tied emails, and manage hardware binding.</p>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px 20px',
        background: '#fff',
        borderRadius: '14px',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        {/* Search Email */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Product Dropdown */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>📦</span>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '34px', width: '100%', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
          >
            <option value="all">All Products</option>
            {productOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Status Pill Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {['all', 'active', 'blocked'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: selectedStatus === s
                  ? (s === 'blocked' ? '#FEE2E2' : s === 'active' ? '#D1FAE5' : '#EFF6FF')
                  : '#fff',
                borderColor: selectedStatus === s
                  ? (s === 'blocked' ? '#FCA5A5' : s === 'active' ? '#6EE7B7' : '#BFDBFE')
                  : 'rgba(0,0,0,0.1)',
                color: selectedStatus === s
                  ? (s === 'blocked' ? '#DC2626' : s === 'active' ? '#059669' : '#2563EB')
                  : '#666',
              }}
            >
              {s === 'all' ? '🗂 All' : s === 'active' ? '✅ Active' : '🚫 Blocked'}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888', flexShrink: 0, fontWeight: 500 }}>
          {filteredLicenses.length} {filteredLicenses.length === 1 ? 'result' : 'results'}
        </div>

        {/* Clear Filters */}
        {(searchEmail || selectedProduct !== 'all' || selectedStatus !== 'all') && (
          <button
            onClick={() => { setSearchEmail(''); setSelectedProduct('all'); setSelectedStatus('all'); }}
            style={{ ...inputStyle, background: 'transparent', color: '#888', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>License Key</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email / Date</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Machine ID</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No licenses found</div>
                  <div style={{ fontSize: '0.875rem' }}>Try adjusting your filters</div>
                </td>
              </tr>
            ) : (
              filteredLicenses.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 500, fontFamily: 'monospace' }}>{lic.licenseKey}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0,113,227,0.08)',
                      color: '#0071E3',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {lic.productName || lic.productId || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>{lic.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {lic.createdAt ? new Date(lic.createdAt.seconds * 1000).toLocaleString() : 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ color: lic.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                      {lic.status.toUpperCase()}
                      {lic.isSubscription && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {lic.pendingCancellation ? 'Cancels at cycle end' : 'Auto-renewing'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {lic.devices && lic.devices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {lic.devices.map((d: any, idx: number) => {
                          const { label, isActive } = deviceLastSeen(d.lastSeen);
                          return (
                            <div
                              key={d.id || idx}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                background: isActive ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.03)',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.08)'}`,
                                minWidth: '180px',
                                maxWidth: '240px',
                              }}
                            >
                              {/* Device name row */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  💻 {d.name || d.id}
                                </span>
                                <button
                                  onClick={() => handleRemoveDevice(lic.id, d.id)}
                                  title="Logout this device remotely"
                                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '2px 7px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                >
                                  ✕ Logout
                                </button>
                              </div>
                              {/* Status + lastSeen row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '1px 7px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
                                  background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.06)',
                                  color: isActive ? '#059669' : '#999',
                                }}>
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isActive ? '#10B981' : '#ccc', display: 'inline-block' }} />
                                  {isActive ? 'Active' : 'Idle'}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#aaa' }}>⏱ {label}</span>
                              </div>
                              {/* Device ID */}
                              <div style={{ fontSize: '0.6rem', color: '#bbb', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.id}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '0.8rem' }}>Not activated yet</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => setGrantItem(lic)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(16, 185, 129, 0.5)', color: '#10B981', fontWeight: 600 }}>
                        🎁 Grant Free
                      </button>
                      <button onClick={() => handleResetHardware(lic.id)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} disabled={!lic.machineId && (!lic.devices || lic.devices.length === 0)}>
                        Reset PC
                      </button>
                      <button onClick={() => handleBlock(lic.id, lic.status)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: lic.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                        {lic.status === 'active' ? 'Block' : 'Unblock'}
                      </button>
                      {lic.isSubscription && lic.subscriptionId && (
                        <button onClick={() => handleManageClick(lic)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(59, 130, 246, 0.5)', color: '#3B82F6' }}>
                          Manage Sub
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Admin Subscription Management Modal ── */}
      {manageSubItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setManageSubItem(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', background: 'var(--bg-card)', borderRadius: '12px', border: `1px solid var(--border-subtle)`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>Manage User Subscription</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{manageSubItem.email} - {manageSubItem.productName}</div>
              </div>
              <button onClick={() => setManageSubItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>
            {subLoading && !subData ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading details from Razorpay...</div>
            ) : subData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: `1px solid var(--border-subtle)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Billing Cycle</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{subData.period || 'Recurring'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</span>
                    <span style={{ color: subData.status === 'active' ? 'var(--success)' : (subData.status === 'cancelled' ? 'var(--danger)' : '#F59E0B'), fontWeight: 600, textTransform: 'capitalize' }}>
                      {subData.status} {manageSubItem.pendingCancellation || subData.cancel_at_cycle_end ? '(Cancels at cycle end)' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Payments Made</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{subData.paid_count}</span>
                  </div>
                  {subData.charge_at && subData.status === 'active' && !manageSubItem.pendingCancellation && !subData.cancel_at_cycle_end && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Next Payment</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(subData.charge_at * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  {subData.current_end && (manageSubItem.pendingCancellation || subData.cancel_at_cycle_end || subData.status === 'cancelled') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Access Ends On</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(subData.current_end * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {subData.status === 'active' && !manageSubItem.pendingCancellation && !subData.cancel_at_cycle_end && cancelStatus === 'idle' && (
                  <button className="btn-secondary" onClick={() => setCancelStatus('confirm')} style={{ width: '100%', padding: '12px', color: '#F87171', borderColor: 'rgba(248,113,113,0.3)', marginTop: '8px' }}>
                    Cancel User's Subscription
                  </button>
                )}
                {cancelStatus === 'confirm' && (
                  <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                    <h4 style={{ color: '#F87171', margin: '0 0 8px 0', fontSize: '0.875rem' }}>Are you sure?</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      You are cancelling this user's subscription. They will retain access until end of their billing cycle.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setCancelStatus('idle')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Go Back</button>
                      <button onClick={handleCancelSubscription} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem', background: '#DC2626', borderColor: '#DC2626' }}>Force Cancel</button>
                    </div>
                  </div>
                )}
                {cancelStatus === 'cancelling' && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Processing cancellation with Razorpay...</div>}
                {cancelStatus === 'error' && (
                  <div style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                    <p style={{ color: '#F87171', fontSize: '0.875rem', margin: 0 }}>{cancelError}</p>
                    <button onClick={() => setCancelStatus('idle')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '12px' }}>Try Again</button>
                  </div>
                )}
                {cancelStatus === 'success' && (
                  <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                    <h4 style={{ color: 'var(--success)', margin: '0 0 4px 0', fontSize: '0.875rem' }}>Successfully Cancelled ✓</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>The user's subscription will not renew.</p>
                    <button onClick={() => setManageSubItem(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem', marginTop: '16px', width: '100%' }}>Close Window</button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--danger)' }}>Could not load subscription details.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Grant Free Access Modal ── */}
      {grantItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setGrantItem(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: 'var(--bg-card)', borderRadius: '16px', border: `1px solid var(--border-subtle)`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700 }}>🎁 Grant Free Access</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{grantItem.email} — {grantItem.productName}</div>
              </div>
              <button onClick={() => setGrantItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Select Duration</label>
              <select value={grantDuration} onChange={(e) => setGrantDuration(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}>
                <option value="7" style={{ background: '#111' }}>7 Days Free Trial</option>
                <option value="30" style={{ background: '#111' }}>1 Month Free (30 Days)</option>
                <option value="60" style={{ background: '#111' }}>2 Months Free (60 Days)</option>
                <option value="365" style={{ background: '#111' }}>1 Year Free (365 Days)</option>
                <option value="custom" style={{ background: '#111' }}>Custom Days...</option>
                <option value="permanent" style={{ background: '#111' }}>⭐ Permanent Lifetime Access (Never Expires)</option>
              </select>
            </div>
            {grantDuration === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Number of Days</label>
                <input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="e.g. 15, 45, 90" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }} />
              </div>
            )}
            <button onClick={handleGrantAccessSubmit} disabled={granting} className="btn-primary" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', color: '#fff', fontWeight: 700, borderRadius: '8px', marginTop: '8px' }}>
              {granting ? 'Granting Access...' : '✓ Activate & Grant Access'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
