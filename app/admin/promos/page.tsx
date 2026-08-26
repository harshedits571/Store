export default function PromosPage() {
  const textMuted = 'var(--text-muted)';

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Promo Codes</h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.9rem' }}>Create and manage discount promo codes for your customers.</p>
        </div>
        <button className="btn-primary" style={{ padding: '10px 20px', borderRadius: '99px', fontSize: '0.85rem' }}>
          + Add Code
        </button>
      </div>

      <div style={{ 
        background: 'var(--bg-card)', 
        borderRadius: '20px', 
        border: '1px solid var(--border-subtle)', 
        padding: '48px 32px', 
        textAlign: 'center', 
        color: textMuted,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        No promo codes active right now. Create one to run a sale!
      </div>
    </div>
  );
}
