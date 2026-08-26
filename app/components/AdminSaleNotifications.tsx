'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminNotifications, SaleToast } from '../context/AdminNotificationContext';

function SaleToastCard({ toast, onDismiss }: { toast: SaleToast; onDismiss: (id: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onDismiss(toast.id);
          return 0;
        }
        return prev - 1.2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, onDismiss, toast.id]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        background: '#ffffff',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(16, 185, 129, 0.15)',
        color: '#0f172a',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        overflow: 'hidden',
        animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Top Banner Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
              fontSize: '1rem'
            }}
          >
            💰
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>New Sale Received!</span>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
              {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          style={{
            background: '#F1F5F9',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            transition: 'background 0.2s ease, color 0.2s ease'
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Sale Info Details */}
      <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toast.itemsSummary}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👤</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                {toast.customerName ? `${toast.customerName} (${toast.customerEmail})` : toast.customerEmail}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {toast.amount > 0 ? `₹${Number(toast.amount).toLocaleString('en-IN')}` : 'Free'}
            </div>
            <div style={{ 
              fontSize: '0.65rem', 
              textTransform: 'uppercase', 
              color: '#059669', 
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '2px',
              display: 'inline-block'
            }}>
              {toast.status || 'VERIFIED'}
            </div>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace', fontWeight: 600 }}>
          ID: #{toast.orderId.slice(0, 8)}
        </span>

        <Link
          href="/admin/orders"
          onClick={() => onDismiss(toast.id)}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#0284C7',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 12px',
            borderRadius: '8px',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            transition: 'all 0.2s ease'
          }}
        >
          View in Orders &rarr;
        </Link>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #10B981, #0284C7)',
          width: `${progress}%`,
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
}

export default function AdminSaleNotifications() {
  const { activeToasts, dismissToast, notificationsEnabled } = useAdminNotifications();

  if (!notificationsEnabled || activeToasts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(60px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      {activeToasts.map((toast) => (
        <SaleToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
