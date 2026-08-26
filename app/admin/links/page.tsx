'use client';

import React, { useState, useMemo } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from '../../context/AdminContext';
import { useStore } from '../../context/StoreContext';

export default function CustomLinksPage() {
  const { customLinks } = useAdmin();
  const { products } = useStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // In-app Toast & Confirmation State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [deleteConfirmLink, setDeleteConfirmLink] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Form State
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [targetScope, setTargetScope] = useState<'all' | 'specific'>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [pricingMode, setPricingMode] = useState<'discount' | 'fixed'>('discount');
  const [discountPercent, setDiscountPercent] = useState<number>(20);
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
    setTargetScope('all');
    setSelectedProducts([]);
    setProductSearch('');
    setPricingMode('discount');
    setDiscountPercent(20);
    setFixedPrices({});
    setMaxRedemptions(0);
    setNote('');
    setShowModal(true);
  };

  const handleOpenEdit = (link: any) => {
    setEditingId(link.id);
    setCode(link.id);
    setActive(link.active ?? true);
    const hasSpecific = Array.isArray(link.products) && link.products.length > 0;
    setTargetScope(hasSpecific ? 'specific' : 'all');
    setSelectedProducts(link.products || []);
    setProductSearch('');
    setPricingMode(link.pricingMode || 'discount');
    setDiscountPercent(link.discountPercent || 0);
    setFixedPrices(link.fixedPrices || {});
    setMaxRedemptions(link.maxRedemptions || 0);
    setNote(link.note || '');
    setShowModal(true);
  };

  const handleGenerateRandomCode = () => {
    const prefixes = ['VIP', 'DEAL', 'SPECIAL', 'PROMO', 'OFFER', 'CREATOR', 'SAVE'];
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setCode(`${randPrefix}${randNum}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return showToast("Link Code is required", "warning");
    
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    
    const effectiveProducts = targetScope === 'specific' ? selectedProducts : [];

    if (pricingMode === 'fixed' && effectiveProducts.length === 0) {
      return showToast("Please select at least 1 specific product when using Fixed Price Override.", "warning");
    }

    const data = {
      active,
      products: effectiveProducts,
      pricingMode,
      discountPercent: pricingMode === 'discount' ? Number(discountPercent) : 0,
      fixedPrices: pricingMode === 'fixed' ? fixedPrices : {},
      maxRedemptions: Number(maxRedemptions),
      note,
      updatedAt: serverTimestamp()
    };

    if (!editingId) {
      if (customLinks.find(l => l.id.toUpperCase() === cleanCode)) {
        return showToast("This link code already exists. Please pick another code.", "error");
      }
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
      showToast(editingId ? `Link "${cleanCode}" updated!` : `Custom Link "${cleanCode}" created successfully! 🎉`, 'success');
    } catch (err: any) {
      showToast("Error saving link: " + err.message, 'error');
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmLink(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmLink) return;
    try {
      await deleteDoc(doc(db, "custom_links", deleteConfirmLink));
      showToast(`Link "${deleteConfirmLink}" has been deleted.`, 'success');
    } catch (err: any) {
      showToast("Failed to delete link: " + err.message, 'error');
    } finally {
      setDeleteConfirmLink(null);
    }
  };

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const handleToggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "custom_links", id), { active: !current });
    showToast(`Link "${id}" set to ${!current ? 'Active' : 'Inactive'}`, 'success');
  };

  const handleCopyLink = (link: any) => {
    let url = `${window.location.origin}?ref=${link.id}`;
    if (link.products && link.products.length === 1) {
      url = `${window.location.origin}/products/${link.products[0]}?ref=${link.id}`;
    } else if (link.products && link.products.length > 1) {
      url = `${window.location.origin}/products?ref=${link.id}`;
    }
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    showToast(`📋 Link copied: ${url}`, 'success');
    setTimeout(() => setCopiedLinkId(null), 2000);
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

  // Filtered products for modal search
  const filteredModalProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => (p.name || '').toLowerCase().includes(q));
  }, [products, productSearch]);

  const textMuted = 'var(--text-muted)';

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Custom Promo Links
          </h1>
          <p style={{ color: textMuted, margin: 0, fontSize: '0.88rem' }}>
            Generate exclusive promotional links, percentage discounts, and fixed price overrides.
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate} style={{ padding: '10px 22px', borderRadius: '100px', fontSize: '0.88rem', fontWeight: 700 }}>
          + Create Custom Link
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Active Links</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalActive}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Total Redemptions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalRedemptions}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Total Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>${totalRevenueUSD.toFixed(2)}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ color: textMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Avg Discount</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{avgDiscount.toFixed(1)}%</div>
        </div>
      </div>

      {/* Links Table */}
      <div style={{ 
        background: 'var(--bg-card)', 
        borderRadius: '20px', 
        border: '1px solid var(--border-subtle)', 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Link Code</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Discount / Deal</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em' }}>Products on Sale</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em', textAlign: 'center' }}>Claims</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em', textAlign: 'right' }}>Revenue</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '16px 24px', color: textMuted, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customLinks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔗</div>
                  <div style={{ fontWeight: 600 }}>No custom links created yet.</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "+ Create Custom Link" above to get started.</div>
                </td>
              </tr>
            ) : (
              customLinks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((link, i) => (
                <tr key={link.id} style={{ borderBottom: i === customLinks.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.95rem', background: 'rgba(0, 113, 227, 0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                      {link.id}
                    </span>
                    {link.note && <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '4px' }}>📝 {link.note}</div>}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {link.pricingMode === 'discount' ? (
                      <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.9rem' }}>
                        {link.discountPercent}% OFF
                      </span>
                    ) : (
                      <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.85rem' }}>
                        FIXED OVERRIDE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', maxWidth: '320px' }}>
                    {link.products && link.products.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {link.products.map((pId: string) => {
                          const prod = products.find(p => p.id === pId);
                          const prodName = prod?.name || pId;
                          const fixed = link.fixedPrices?.[pId];
                          return (
                            <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-subtle)', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.78rem', 
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                maxWidth: '240px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                📦 {prodName}
                              </span>
                              {fixed && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                  ₹{fixed.inr ?? 0} / ${fixed.usd ?? 0}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(0, 113, 227, 0.08)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0, 113, 227, 0.2)' }}>
                        🌐 All Store Products (Global)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 600 }}>
                    {link.currentRedemptions || 0} / {link.maxRedemptions === 0 ? '∞' : link.maxRedemptions}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 700, textAlign: 'right' }}>
                    ${(link.totalSalesUSD || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleToggleActive(link.id, link.active)}
                      style={{ 
                        background: link.active ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)', 
                        color: link.active ? '#10B981' : '#EF4444',
                        border: link.active ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '4px 10px', 
                        borderRadius: '100px', 
                        cursor: 'pointer', 
                        fontSize: '0.725rem', 
                        fontWeight: 700
                      }}
                    >
                      {link.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleCopyLink(link)} 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.78rem', 
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          background: copiedLinkId === link.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                          color: copiedLinkId === link.id ? '#10B981' : 'var(--text-primary)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedLinkId === link.id ? '✓ Copied' : '📋 Copy Link'}
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(link)} 
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✎ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(link.id)} 
                        style={{ padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EASY PEEZY REDESIGNED MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInScale 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {editingId ? `✏️ Edit Custom Link (${editingId})` : '✨ Create Custom Promo Link'}
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: textMuted }}>
                  Set up discounts and custom pricing for campaigns.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: textMuted,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* Step 1: Link Code */}
              {!editingId && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      1. Promo Code / Link Slug
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🎲 Generate Random
                    </button>
                  </div>
                  <input
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. SUMMER50, VIP99, YOUTUBE"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Step 2: Target Scope (All vs Specific) */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  2. Apply Discount To:
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setTargetScope('all'); setSelectedProducts([]); }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: targetScope === 'all' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: targetScope === 'all' ? 'rgba(0, 113, 227, 0.08)' : 'var(--bg-secondary)',
                      color: targetScope === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🌐</span> All Products (Storewide)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('specific')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: targetScope === 'specific' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: targetScope === 'specific' ? 'rgba(0, 113, 227, 0.08)' : 'var(--bg-secondary)',
                      color: targetScope === 'specific' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🎯</span> Specific Products ({selectedProducts.length})
                  </button>
                </div>

                {/* Compact Scrollable Product Picker if Specific is selected */}
                {targetScope === 'specific' && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)',
                    padding: '12px',
                    marginTop: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="🔍 Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.78rem',
                          outline: 'none'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts(products.map(p => p.id))}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Select All
                        </button>
                        <span style={{ color: textMuted }}>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProducts([])}
                          style={{ background: 'none', border: 'none', color: textMuted, fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                      {filteredModalProducts.map(p => {
                        const isChecked = selectedProducts.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: isChecked ? 'rgba(0, 113, 227, 0.1)' : 'var(--bg-card)',
                              border: isChecked ? '1px solid rgba(0, 113, 227, 0.3)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: isChecked ? 700 : 500
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleProductToggle(p.id)}
                            />
                            <span style={{ color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Pricing Strategy */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  3. Pricing Discount Type:
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setPricingMode('discount')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: pricingMode === 'discount' ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                      background: pricingMode === 'discount' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                      color: pricingMode === 'discount' ? '#10B981' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🏷️ Percentage Discount (%)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPricingMode('fixed');
                      if (targetScope === 'all') setTargetScope('specific');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: pricingMode === 'fixed' ? '2px solid #F59E0B' : '1px solid var(--border-subtle)',
                      background: pricingMode === 'fixed' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)',
                      color: pricingMode === 'fixed' ? '#F59E0B' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    💵 Exact Fixed Price (₹ / $)
                  </button>
                </div>

                {/* Percentage Discount Options */}
                {pricingMode === 'discount' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {[10, 20, 30, 50, 80, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercent(pct)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: discountPercent === pct ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                            background: discountPercent === pct ? '#10B981' : 'var(--bg-card)',
                            color: discountPercent === pct ? '#fff' : 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          {pct === 100 ? '🎁 100% Free' : `${pct}% OFF`}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: textMuted }}>Custom %:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={discountPercent}
                        onChange={e => setDiscountPercent(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '8px 12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10B981' }}>% Discount</span>
                    </div>
                  </div>
                )}

                {/* Fixed Price Override Options */}
                {pricingMode === 'fixed' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                    {selectedProducts.length === 0 ? (
                      <div style={{ color: '#EF4444', fontSize: '0.82rem', fontWeight: 600 }}>
                        ⚠️ Select specific products above in Step 2 to assign exact INR & USD prices.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                        {selectedProducts.map(prodId => {
                          const prodName = products.find(p => p.id === prodId)?.name || prodId;
                          return (
                            <div key={prodId} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ flex: '1 1 120px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {prodName}
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="₹ INR Price"
                                value={fixedPrices[prodId]?.inr ?? ''}
                                onChange={e => handleFixedPriceChange(prodId, 'inr', e.target.value)}
                                style={{ width: '90px', padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                                required
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="$ USD Price"
                                value={fixedPrices[prodId]?.usd ?? ''}
                                onChange={e => handleFixedPriceChange(prodId, 'usd', e.target.value)}
                                style={{ width: '90px', padding: '6px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, outline: 'none' }}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 4: Redemptions & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: textMuted, fontWeight: 600, fontSize: '0.78rem' }}>Max Uses (0 = Unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={maxRedemptions}
                    onChange={e => setMaxRedemptions(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: textMuted, fontWeight: 600, fontSize: '0.78rem' }}>Internal Note (Optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. YouTube Video Sponsor"
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}
                  disabled={pricingMode === 'fixed' && selectedProducts.length === 0}
                >
                  {editingId ? '💾 Save Changes' : '🚀 Create Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deleteConfirmLink && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            padding: '24px 28px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              margin: '0 auto 16px auto'
            }}>
              🗑️
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800 }}>
              Delete Custom Link?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: textMuted, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>"{deleteConfirmLink}"</strong>? Anyone using this link will no longer receive the discount.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmLink(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                }}
              >
                Yes, Delete Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING IN-APP TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 10001,
          background: toast.type === 'error' ? '#EF4444' : toast.type === 'warning' ? '#F59E0B' : '#0071e3',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          fontWeight: 600,
          animation: 'slideInRight 0.25s ease-out'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : toast.type === 'warning' ? '🔔' : '✓'}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginLeft: '6px',
              opacity: 0.8
            }}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
