'use client';
import { useState } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '../../context/AdminContext';
import { useStore } from '../../context/StoreContext';

export default function CustomLinksPage() {
  const { customLinks } = useAdmin();
  const { products } = useStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<'discount' | 'fixed'>('discount');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [fixedPrices, setFixedPrices] = useState<Record<string, { inr: number, usd: number }>>({});
  const [maxRedemptions, setMaxRedemptions] = useState<number>(0);
  const [note, setNote] = useState('');

  // Stats
  const totalActive = customLinks.filter(l => l.active).length;
  const totalRedemptions = customLinks.reduce((acc, l) => acc + (l.currentRedemptions || 0), 0);
  const totalRevenueUSD = customLinks.reduce((acc, l) => acc + (l.totalSalesUSD || 0), 0);
  const avgDiscount = customLinks.filter(l => l.pricingMode === 'discount').length > 0 
    ? (customLinks.filter(l => l.pricingMode === 'discount').reduce((acc, l) => acc + (l.discountPercent || 0), 0) / customLinks.filter(l => l.pricingMode === 'discount').length) 
    : 0;

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode('');
    setActive(true);
    setSelectedProducts([]);
    setPricingMode('discount');
    setDiscountPercent(0);
    setFixedPrices({});
    setMaxRedemptions(0);
    setNote('');
    setShowModal(true);
  };

  const handleOpenEdit = (link: any) => {
    setEditingId(link.id);
    setCode(link.id);
    setActive(link.active ?? true);
    setSelectedProducts(link.products || []);
    setPricingMode(link.pricingMode || 'discount');
    setDiscountPercent(link.discountPercent || 0);
    setFixedPrices(link.fixedPrices || {});
    setMaxRedemptions(link.maxRedemptions || 0);
    setNote(link.note || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return alert("Code is required");
    
    const cleanCode = code.trim().toUpperCase();
    
    const data = {
      active,
      products: selectedProducts,
      pricingMode,
      discountPercent: pricingMode === 'discount' ? Number(discountPercent) : 0,
      fixedPrices: pricingMode === 'fixed' ? fixedPrices : {},
      maxRedemptions: Number(maxRedemptions),
      note,
      updatedAt: serverTimestamp()
    };

    if (!editingId) {
      if (customLinks.find(l => l.id === cleanCode)) return alert("Code already exists");
      Object.assign(data, {
        currentRedemptions: 0,
        totalSalesINR: 0,
        totalSalesUSD: 0,
        createdAt: serverTimestamp()
      });
    }

    try {
      await setDoc(doc(db, "custom_links", cleanCode), data, { merge: true });
      setShowModal(false);
    } catch (err: any) {
      alert("Error saving link: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Delete custom link ${id}? This cannot be undone.`)) {
      await deleteDoc(doc(db, "custom_links", id));
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "custom_links", id), { active: !current });
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}?ref=${id}`;
    navigator.clipboard.writeText(url);
    alert(`Copied: ${url}`);
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) ? prev.filter(p => p !== productId) : [...prev, productId]
    );
  };

  const handleFixedPriceChange = (productId: string, currency: 'inr' | 'usd', val: string) => {
    setFixedPrices(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { inr: 0, usd: 0 }),
        [currency]: val === '' ? '' : Number(val)
      }
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2 mb-4" style={{ margin: 0 }}>Custom Links</h1>
          <p className="text-secondary" style={{ margin: '8px 0 0 0' }}>Manage exclusive shareable links and pricing overrides.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate} style={{ padding: '12px 24px' }}>
          + Create Custom Link
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', textTransform: 'uppercase' }}>Active Links</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{totalActive}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', textTransform: 'uppercase' }}>Total Redemptions</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{totalRedemptions}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', textTransform: 'uppercase' }}>Total Revenue (USD)</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>${totalRevenueUSD.toFixed(2)}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', textTransform: 'uppercase' }}>Avg Discount</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{avgDiscount.toFixed(1)}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'x-auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Code</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Pricing</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Claims</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Revenue</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customLinks.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No custom links found.</td></tr>
            ) : (
              customLinks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((link) => (
                <tr key={link.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#3B82F6' }}>{link.id}</td>
                  <td style={{ padding: '16px' }}>
                    {link.pricingMode === 'discount' 
                      ? <span style={{ color: 'var(--success)' }}>{link.discountPercent}% OFF</span> 
                      : <span style={{ color: '#F59E0B' }}>FIXED PRICE</span>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {link.products?.length > 0 ? `${link.products.length} products` : 'All products'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {link.currentRedemptions || 0} / {link.maxRedemptions === 0 ? '∞' : link.maxRedemptions}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>
                    ${(link.totalSalesUSD || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button 
                      onClick={() => handleToggleActive(link.id, link.active)}
                      style={{ 
                        background: link.active ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                        color: link.active ? '#34D399' : '#F87171',
                        border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                      }}
                    >
                      {link.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button onClick={() => handleCopyLink(link.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: '8px' }}>Copy URL</button>
                    <button onClick={() => handleOpenEdit(link)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: '8px' }}>Edit</button>
                    <button onClick={() => handleDelete(link.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#F87171' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid var(--border-subtle)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem' }}>{editingId ? `Edit ${editingId}` : 'Create Custom Link'}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {!editingId && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Link Code</label>
                  <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER50" style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Products (Leave empty for ALL products)</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {products.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleProductToggle(p.id)} />
                      <span style={{ fontSize: '0.875rem' }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Pricing Mode</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setPricingMode('discount')} style={{ flex: 1, padding: '12px', background: pricingMode === 'discount' ? '#3B82F6' : 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer' }}>Percentage Discount</button>
                  <button type="button" onClick={() => setPricingMode('fixed')} style={{ flex: 1, padding: '12px', background: pricingMode === 'fixed' ? '#F59E0B' : 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer' }}>Fixed Price Override</button>
                </div>
              </div>

              {pricingMode === 'discount' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Discount Percentage (%)</label>
                  <input type="number" min="1" max="100" required value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />
                </div>
              )}

              {pricingMode === 'fixed' && (
                <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Set exact prices for the targeted products.</div>
                  {selectedProducts.length === 0 ? (
                    <div style={{ color: '#F87171', fontSize: '0.875rem' }}>You must select specific target products above to use Fixed Pricing.</div>
                  ) : (
                    selectedProducts.map(prodId => {
                      const prodName = products.find(p => p.id === prodId)?.name || prodId;
                      return (
                        <div key={prodId} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                          <div style={{ width: '150px', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prodName}</div>
                          <input type="number" step="0.01" placeholder="INR" value={fixedPrices[prodId]?.inr ?? ''} onChange={e => handleFixedPriceChange(prodId, 'inr', e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} required />
                          <input type="number" step="0.01" placeholder="USD" value={fixedPrices[prodId]?.usd ?? ''} onChange={e => handleFixedPriceChange(prodId, 'usd', e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} required />
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Max Redemptions (0 = Unlimited)</label>
                <input type="number" min="0" value={maxRedemptions} onChange={e => setMaxRedemptions(Number(e.target.value))} style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Internal Note (Optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. For YouTube Sponsor" style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px', minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }} disabled={pricingMode === 'fixed' && selectedProducts.length === 0}>
                  {editingId ? 'Save Changes' : 'Create Link'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '12px 24px' }}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
