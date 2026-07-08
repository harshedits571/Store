export default function PromosPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2 mb-4">Promo Codes</h1>
          <p className="text-secondary">Create discount codes for your customers.</p>
        </div>
        <button className="btn-primary">+ Add Code</button>
      </div>

      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No promo codes active right now. Create one to run a sale!
      </div>
    </div>
  );
}
