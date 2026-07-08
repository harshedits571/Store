'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [assetUrl, setAssetUrl] = useState('');
  
  // Pricing & Inventory
  const [price, setPrice] = useState('');
  const [inrPrice, setInrPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [inrSalePrice, setInrSalePrice] = useState('');
  const [stockStatus, setStockStatus] = useState('in_stock');
  
  // Organization
  const [category, setCategory] = useState('Plugin');
  const [tags, setTags] = useState('');
  const [requiresLicense, setRequiresLicense] = useState(true);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !description || !assetUrl) {
      alert("Please fill all required fields (Name, Price, Description, Asset URL)");
      return;
    }
    
    setSaving(true);
    
    try {
      await addDoc(collection(db, "products"), {
        name,
        description,
        imageUrl: imageUrls[0] || '',
        imageUrls: imageUrls.filter(url => url.trim() !== ''),
        downloadUrl: assetUrl,
        price: parseFloat(price),
        inrPrice: inrPrice ? parseFloat(inrPrice) : null,
        salePrice: salePrice ? parseFloat(salePrice) : null,
        inrSalePrice: inrSalePrice ? parseFloat(inrSalePrice) : null,
        stockStatus,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        requiresLicense,
        sales: 0,
        createdAt: serverTimestamp()
      });

      router.push('/admin/products');
    } catch (error) {
      console.error("Error publishing product:", error);
      alert("Error saving product.");
      setSaving(false);
    }
  };

  const panelBg = 'var(--bg-card)';
  const borderColor = 'var(--border-subtle)';
  const textMuted = 'var(--text-muted)';

  return (
    <div style={{ paddingBottom: '64px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: textMuted, marginBottom: '8px' }}>
            <Link href="/admin/products" style={{ color: '#3B82F6', textDecoration: 'none' }}>Products</Link>
            <span>&gt;</span>
            <span>Add a product</span>
          </div>
          <h1 className="h2" style={{ margin: 0 }}>Add a product</h1>
          <p style={{ color: textMuted, margin: '8px 0 0 0', fontSize: '0.875rem' }}>Create a new asset for your store</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/admin/products" className="btn-secondary" style={{ padding: '10px 24px' }}>Discard</Link>
          <button className="btn-primary" onClick={handlePublish} style={{ padding: '10px 24px' }} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish product'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Main Column */}
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Title & Description */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <label style={{ fontWeight: 600, color: '#E5E7EB' }}>Product Title *</label>
              <input 
                type="text" 
                style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%', fontSize: '1rem' }} 
                placeholder="Write title here..." 
                value={name} 
                onChange={e => setName(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600, color: '#E5E7EB' }}>Product Description *</label>
              <textarea 
                style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%', fontSize: '0.875rem', minHeight: '150px', resize: 'vertical' }} 
                placeholder="Write a description here..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </div>
          </div>

          {/* Media Links */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 24px 0', color: '#E5E7EB' }}>Display & Download Links</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Display Image URLs</label>
                {imageUrls.map((url, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="url" 
                      style={{ background: 'transparent', border: `1px dashed ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', flex: 1 }} 
                      placeholder="https://example.com/image.png" 
                      value={url} 
                      onChange={e => {
                        const newUrls = [...imageUrls];
                        newUrls[index] = e.target.value;
                        setImageUrls(newUrls);
                      }} 
                    />
                    {imageUrls.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newUrls = imageUrls.filter((_, i) => i !== index);
                          setImageUrls(newUrls);
                        }}
                        style={{ background: 'transparent', border: `1px solid var(--danger)`, color: 'var(--danger)', padding: '0 16px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setImageUrls([...imageUrls, ''])}
                  style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start', fontSize: '0.875rem' }}
                >
                  + Add Another Image
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Asset Download URL * (The actual file customers receive)</label>
                <input 
                  type="url" 
                  style={{ background: 'transparent', border: `1px dashed #3B82F6`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                  placeholder="https://drive.google.com/..." 
                  value={assetUrl} 
                  onChange={e => setAssetUrl(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Inventory & Pricing */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${borderColor}` }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#E5E7EB' }}>Inventory & Pricing</h3>
            </div>
            
            <div style={{ display: 'flex' }}>
              {/* Left tabs (Mocked for layout) */}
              <div style={{ width: '200px', borderRight: `1px solid ${borderColor}`, padding: '16px 0' }}>
                <div style={{ padding: '12px 24px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', fontWeight: 500, borderLeft: '3px solid #3B82F6' }}>Pricing</div>
                <div style={{ padding: '12px 24px', color: textMuted, fontSize: '0.875rem' }}>Restock</div>
                <div style={{ padding: '12px 24px', color: textMuted, fontSize: '0.875rem' }}>Attributes</div>
              </div>
              
              {/* Right content */}
              <div style={{ padding: '24px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Regular price *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                      placeholder="$$$" 
                      value={price} 
                      onChange={e => setPrice(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Sale price (Optional)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                      placeholder="$$$" 
                      value={salePrice} 
                      onChange={e => setSalePrice(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Regular Price (INR) *Optional*</label>
                    <input 
                      type="number" 
                      style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                      placeholder="₹" 
                      value={inrPrice} 
                      onChange={e => setInrPrice(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Sale price (INR) *Optional*</label>
                    <input 
                      type="number" 
                      style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                      placeholder="₹" 
                      value={inrSalePrice} 
                      onChange={e => setInrSalePrice(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Stock Status</label>
                  <select 
                    style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%', appearance: 'none' }}
                    value={stockStatus}
                    onChange={e => setStockStatus(e.target.value)}
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="offline">Offline / Hidden</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Organize */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 24px 0', color: '#E5E7EB' }}>Organize</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Category</label>
                </div>
                <select 
                  style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%', appearance: 'none' }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option>Plugin</option>
                  <option>Script</option>
                  <option>Assets</option>
                  <option>Audio</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontWeight: 500, color: textMuted, fontSize: '0.875rem' }}>Tags (comma separated)</label>
                </div>
                <input 
                  type="text" 
                  style={{ background: 'transparent', border: `1px solid ${borderColor}`, color: 'var(--text-primary)', padding: '12px', borderRadius: '4px', width: '100%' }} 
                  placeholder="e.g. video, transitions, pro" 
                  value={tags} 
                  onChange={e => setTags(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* License Settings */}
          <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 16px 0', color: '#E5E7EB' }}>Security</h3>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={requiresLicense}
                onChange={e => setRequiresLicense(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#3B82F6', marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Generate License Keys</div>
                <div style={{ color: textMuted, fontSize: '0.75rem', marginTop: '4px' }}>If enabled, a unique DRM license key will be generated upon purchase for Adobe Extension verification.</div>
              </div>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
}
