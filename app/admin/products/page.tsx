'use client';
import { useState } from 'react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAdmin } from '../../context/AdminContext';

export default function AdminProducts() {
  const { products } = useAdmin();

  // Handle Edit Price
  const handleEditPrice = async (id: string, currentPrice: number) => {
    const newPriceStr = prompt("Enter new price:", currentPrice.toString());
    if (newPriceStr !== null) {
      const newPrice = parseFloat(newPriceStr);
      if (!isNaN(newPrice)) {
        try {
          await updateDoc(doc(db, "products", id), { price: newPrice });
        } catch (error) {
          console.error("Error updating price:", error);
        }
      } else {
        alert("Invalid price entered.");
      }
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle Copy Link
  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/products/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Manage Products</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Add, edit, and manage your digital assets catalog.</p>
        </div>
        <Link href="/admin/products/add" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '99px', fontSize: '0.85rem' }}>
          + Add New Product
        </Link>
      </div>

      {/* Product List */}
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
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Product</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Category</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Price</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Stock</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Sold</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Earned</th>
              <th style={{ padding: '18px 24px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No products found. Add one above.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '18px 24px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {(product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0]) || product.imageUrl ? (
                        <img src={(product.imageUrls && product.imageUrls[0]) || product.imageUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid var(--border-glass)' }}>📦</div>
                      )}
                      <div>
                        {product.name}
                        {product.requiresLicense && (
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', background: 'rgba(41, 151, 255, 0.1)', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(41, 151, 255, 0.2)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                            <code style={{ color: '#2997ff', fontWeight: 600 }}>{product.id}</code>
                            <button onClick={() => { navigator.clipboard.writeText(product.id); alert('ID Copied!'); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>📋</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem', border: '1px solid var(--border-glass)', fontWeight: 500 }}>{product.category}</span>
                  </td>
                  <td style={{ padding: '18px 24px', fontWeight: 700 }}>
                    {(() => {
                      const inrVal = product.inrSalePrice ?? product.inrPrice ?? (product.versions?.[0]?.inrSalePrice ?? product.versions?.[0]?.inrPrice);
                      const usdVal = product.salePrice ?? product.price ?? (product.versions?.[0]?.salePrice ?? product.versions?.[0]?.price);
                      
                      const hasInr = inrVal !== undefined && inrVal !== null && inrVal !== '';
                      const hasUsd = usdVal !== undefined && usdVal !== null && usdVal !== '';
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {hasInr ? (
                            <span>₹{Number(inrVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          ) : hasUsd ? (
                            <span>₹{(Number(usdVal) * 84).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          ) : (
                            <span>Free</span>
                          )}
                          {hasUsd && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              (${Number(usdVal).toFixed(2)})
                            </span>
                          )}
                          {product.salePrice && product.price && (
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>
                              ${product.price}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    {product.stockStatus === 'out_of_stock' ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem' }}>Out of Stock</span>
                    ) : product.stockStatus === 'offline' ? (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>Offline</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>In Stock</span>
                    )}
                  </td>
                  <td style={{ padding: '18px 24px', fontWeight: 600 }}>{product.sales || 0}</td>
                  <td style={{ padding: '18px 24px', fontWeight: 700 }}>
                    ₹{(Number(product.revenueINR) || Number(product.revenueUSD) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => handleCopyLink(product.id)} 
                      style={{ 
                        padding: '6px 14px', 
                        fontSize: '0.75rem', 
                        marginRight: '6px', 
                        borderRadius: '99px',
                        background: copiedId === product.id ? 'rgba(16,185,129,0.1)' : undefined,
                        color: copiedId === product.id ? '#059669' : undefined,
                        borderColor: copiedId === product.id ? '#10B981' : undefined,
                        fontWeight: copiedId === product.id ? 700 : undefined
                      }}
                    >
                      {copiedId === product.id ? '✓ Copied' : 'Copy Link'}
                    </button>
                    <Link href={`/admin/products/edit/${product.id}`} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem', marginRight: '6px', textDecoration: 'none', borderRadius: '99px' }}>Edit</Link>
                    <button className="btn-secondary" onClick={() => handleDelete(product.id)} style={{ padding: '6px 14px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(255, 59, 48, 0.3)', borderRadius: '99px' }}>Delete</button>
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
