import React from 'react';

export default function LegalLayout({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Pastel purple to blue gradient
      minHeight: '100vh',
      color: '#1f2937', // Dark gray text for readability
      paddingTop: '120px',
      paddingBottom: '80px'
    }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', padding: '48px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, textAlign: 'center', marginBottom: '48px', color: '#111827' }}>
          {title}
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '1rem', lineHeight: '1.7' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
