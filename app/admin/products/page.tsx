'use client';
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

  // Handle Copy Link
  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/products/${id}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2 mb-4">Manage Products</h1>
          <p className="text-secondary">Add, edit, and manage your digital assets.</p>
        </div>
        <Link href="/admin/products/add" className="btn-primary">
          + Add New Product
        </Link>
      </div>

      {/* Product List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Price</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Stock</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Sold</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Earned</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center' }}>No products found. Add one above.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {(product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0]) || product.imageUrl ? (
                        <img src={(product.imageUrls && product.imageUrls[0]) || product.imageUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                      )}
                      <div>
                        {product.name}
                        {product.requiresLicense && (
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Ext ID:</span>
                            <code style={{ color: 'var(--accent-primary)' }}>{product.id}</code>
                            <button onClick={() => { navigator.clipboard.writeText(product.id); alert('ID Copied!'); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem' }}>📋</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>{product.category}</span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    ${parseFloat(product.price).toFixed(2)}
                    {product.salePrice && <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.75rem' }}>${product.salePrice}</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {product.stockStatus === 'out_of_stock' ? (
                      <span style={{ color: 'var(--danger)' }}>Out of Stock</span>
                    ) : product.stockStatus === 'offline' ? (
                      <span style={{ color: 'var(--text-secondary)' }}>Offline</span>
                    ) : (
                      <span style={{ color: 'var(--success)' }}>In Stock</span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>{product.sales || 0}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      {(product.revenueUSD || 0) > 0 && <div>${Number(product.revenueUSD).toFixed(2)}</div>}
                      {(product.revenueINR || 0) > 0 && <div style={{ color: 'var(--text-secondary)' }}>₹{Number(product.revenueINR).toFixed(2)}</div>}
                      {!(product.revenueUSD || 0) && !(product.revenueINR || 0) && '$0.00'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button className="btn-secondary" onClick={() => handleCopyLink(product.id)} style={{ padding: '4px 12px', fontSize: '0.75rem', marginRight: '8px', display: 'inline-block' }}>Copy Link</button>
                    <Link href={`/admin/products/edit/${product.id}`} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', marginRight: '8px', textDecoration: 'none', display: 'inline-block' }}>Edit</Link>
                    <button className="btn-secondary" onClick={() => handleDelete(product.id)} style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
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
