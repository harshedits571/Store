import React from 'react';

export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      gap: '16px',
    }}>
      {/* Sleek Apple-style spinner */}
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(0, 113, 227, 0.15)',
        borderTopColor: '#0071E3',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite',
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
