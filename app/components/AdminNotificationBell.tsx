'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAdminNotifications } from '../context/AdminNotificationContext';

export default function AdminNotificationBell() {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    soundEnabled,
    setSoundEnabled,
    soundType,
    setSoundType,
    recentSalesHistory,
    testNotification,
    playSaleSound
  } = useAdminNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTestSound = () => {
    setTesting(true);
    testNotification();
    setTimeout(() => setTesting(false), 1000);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: notificationsEnabled ? 'rgba(0, 113, 227, 0.08)' : 'rgba(100, 116, 139, 0.1)',
          border: `1px solid ${notificationsEnabled ? 'rgba(0, 113, 227, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`,
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: notificationsEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
          fontSize: '0.85rem',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
        title="Sale Notification Settings"
      >
        <span style={{ fontSize: '1rem', display: 'inline-flex', alignItems: 'center' }}>
          {notificationsEnabled ? (soundEnabled ? '🔔' : '🔕') : '🚫'}
        </span>
        <span style={{ fontSize: '0.78rem' }}>
          {notificationsEnabled ? (soundEnabled ? 'Alerts: ON' : 'Muted') : 'Alerts: OFF'}
        </span>
        {notificationsEnabled && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
              display: 'inline-block'
            }}
          />
        )}
      </button>

      {/* Settings & History Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '320px',
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.18)',
            padding: '16px',
            zIndex: 1000,
            color: 'var(--text-primary)',
            animation: 'fadeInScale 0.18s ease-out forwards',
          }}
        >
          <style>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.96) translateY(-6px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Live Sale Alerts</h4>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instant audio & popup on new orders</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✕
            </button>
          </div>

          {/* Control Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            
            {/* 1. Notification Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Popup Notifications</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Show toast alert when order arrives</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: notificationsEnabled ? '#10B981' : 'rgba(120, 120, 128, 0.3)',
                    transition: '0.2s',
                    borderRadius: '24px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: notificationsEnabled ? '20px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.2s',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* 2. Sound Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Alert Sound 🔊</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Play audio chime on sale</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={soundEnabled && notificationsEnabled}
                  disabled={!notificationsEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: notificationsEnabled ? 'pointer' : 'not-allowed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: (soundEnabled && notificationsEnabled) ? '#0071E3' : 'rgba(120, 120, 128, 0.3)',
                    opacity: notificationsEnabled ? 1 : 0.5,
                    transition: '0.2s',
                    borderRadius: '24px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: (soundEnabled && notificationsEnabled) ? '20px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.2s',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* 3. Sound Tone Selection */}
            {soundEnabled && notificationsEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sound Tone:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['cash_register', 'chime', 'bell'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSoundType(type);
                        playSaleSound(type);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        border: '1px solid',
                        cursor: 'pointer',
                        background: soundType === type ? 'rgba(0, 113, 227, 0.15)' : 'var(--bg-secondary)',
                        color: soundType === type ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        borderColor: soundType === type ? 'var(--accent-primary)' : 'var(--border-subtle)'
                      }}
                    >
                      {type === 'cash_register' ? '💸 Cash' : type === 'chime' ? '✨ Chime' : '🔔 Bell'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test Button */}
            <button
              type="button"
              onClick={handleTestSound}
              disabled={testing}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                transition: 'opacity 0.2s ease',
              }}
            >
              <span>{testing ? '🔊 Playing...' : '⚡ Test Sale Notification'}</span>
            </button>
          </div>

          {/* Recent Alerts List */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Sale Alerts ({recentSalesHistory.length})
            </div>

            {recentSalesHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Waiting for incoming sales...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {recentSalesHistory.slice(0, 4).map((sale) => (
                  <div
                    key={sale.id}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sale.itemsSummary}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                        {sale.customerEmail}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#10B981', flexShrink: 0 }}>
                      ₹{Number(sale.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                View all orders in dashboard &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
