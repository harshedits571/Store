import React from 'react';

export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: 'var(--accent-primary)',
        borderRadius: '50%',
        animation: 'spin 1s ease-in-out infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
