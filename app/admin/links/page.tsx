'use client';
import { useState, useEffect } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '../../context/AdminContext';

export default function CustomLinksPage() {
  const { products, customLinks: links } = useAdmin();
  
  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || newPrice === '') return;
    setSaving(true);

    try {
      const selectedProduct = products.find(p => p.id === selectedProductId);
      
      // Generate a short 6-character random token
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newLink = {
        token,
        productId: selectedProductId,
        productName: selectedProduct.name,
        originalPrice: selectedProduct.price,
        newPrice: parseFloat(newPrice),
        category: selectedProduct.category,
        requiresLicense: selectedProduct.requiresLicense || false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "custom_links"), newLink);
      

      setNewPrice('');
    } catch (err) {
      console.error(err);
      alert("Error generating link");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this custom link?")) {
      await deleteDoc(doc(db, "custom_links", id));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2 mb-4">Custom Links & Promos</h1>
          <p className="text-secondary">Generate direct checkout links with discounted or free pricing.</p>
        </div>
      </div>

      {/* Generate Form */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px' }}>
        <h3 className="h3" style={{ marginBottom: '24px' }}>Create New Custom Link</h3>
        <form onSubmit={handleGenerateLink} style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Select Product</label>
            <select className="input-field" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} required>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Retail: ${p.price})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Custom Price ($)</label>
            <input type="number" step="0.01" min="0" className="input-field" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="e.g. 0.00 for free" required />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '12px 32px', height: '48px' }} disabled={saving || products.length === 0}>
            {saving ? 'Generating...' : '+ Generate'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>New Price</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Shareable Link</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center' }}>No custom links generated yet.</td></tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px' }}>{link.productName}</td>
                  <td style={{ padding: '16px', fontWeight: 500, color: 'var(--success)' }}>${Number(link.newPrice).toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        className="input-field" 
                        style={{ padding: '4px 8px', fontSize: '0.875rem', width: '250px' }} 
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/custom/${link.token}`}
                      />
                      <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/custom/${link.token}`);
                        alert("Link copied!");
                      }}>Copy</button>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button className="btn-secondary" onClick={() => handleDelete(link.id)} style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
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
