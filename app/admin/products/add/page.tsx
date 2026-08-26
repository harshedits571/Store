'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../ProductStudio.module.css';

export default function AddProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Active Studio Tab
  const [activeTab, setActiveTab] = useState<'product' | 'content' | 'receipt' | 'share'>('product');
  const [previewMode, setPreviewMode] = useState<'store' | 'receipt'>('store');
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [assetUrl, setAssetUrl] = useState('');
  const [receiptMessage, setReceiptMessage] = useState('Thank you for purchasing! Your download is ready. Enjoy creating! ✨');
  const [receiptButtonText, setReceiptButtonText] = useState('Download Asset');
  
  // Pricing & Inventory
  const [price, setPrice] = useState('');
  const [inrPrice, setInrPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [inrSalePrice, setInrSalePrice] = useState('');
  const [stockStatus, setStockStatus] = useState('in_stock');
  
  // Versions / Variants
  const [hasVersions, setHasVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([{ id: 'v1', name: 'Basic', price: '', salePrice: '', inrPrice: '', inrSalePrice: '', assetUrl: '', stockStatus: 'in_stock', isSubscription: false, billingPeriod: 'monthly', planId: null }]);
  
  // Organization
  const [category, setCategory] = useState('Plugin');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [tags, setTags] = useState('');
  const [requiresLicense, setRequiresLicense] = useState(true);

  const PRESET_CATEGORIES = ['Plugin', 'Script', 'Assets', 'Audio', 'Presets', 'LUTs', 'Templates', 'Overlays', 'Bundle'];

  // Subscription Settings
  const [isSubscription, setIsSubscription] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  // Long-Form Landing Page Data
  const [videoUrl, setVideoUrl] = useState('');
  const [presetList, setPresetList] = useState('');
  const [features, setFeatures] = useState<{title: string, description: string, imageUrl: string}[]>([]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      alert("Please fill all required fields (Name, Description)");
      return;
    }
    
    if (hasVersions) {
      if (versions.length === 0 || versions.some(v => !v.name || !v.price || !v.assetUrl)) {
        alert("Please ensure all versions have a Name, Price, and Asset URL.");
        return;
      }
    } else {
      if (!price || !assetUrl) {
        alert("Please fill all required fields (Price, Asset URL)");
        return;
      }
    }
    
    setSaving(true);
    
    try {
      let planId = null;

      if (!hasVersions && isSubscription) {
        // Create Razorpay Plan for single product
        const actualInrAmount = inrSalePrice !== '' && inrSalePrice !== null ? parseFloat(inrSalePrice) : (inrPrice !== '' && inrPrice !== null ? parseFloat(inrPrice) : (salePrice !== '' && salePrice !== null ? parseFloat(salePrice) * 84 : parseFloat(price) * 84));

        const planRes = await fetch('/api/admin/create-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            description: description,
            amount: actualInrAmount,
            currency: 'INR',
            period: billingPeriod
          })
        });

        if (planRes.ok) {
          const planData = await planRes.json();
          planId = planData.planId;
        } else {
          const errorData = await planRes.json().catch(() => ({}));
          alert(`Error creating Razorpay plan: ${errorData.error || 'Failed to create plan on Razorpay.'}`);
          setSaving(false);
          return;
        }
      }

      if (hasVersions) {
        for (let i = 0; i < versions.length; i++) {
          let v = versions[i];
          if (v.isSubscription) {
            const vActualInrAmount = v.inrSalePrice !== '' && v.inrSalePrice != null ? parseFloat(v.inrSalePrice) : (v.inrPrice !== '' && v.inrPrice != null ? parseFloat(v.inrPrice) : (v.salePrice !== '' && v.salePrice != null ? parseFloat(v.salePrice) * 84 : parseFloat(v.price) * 84));
            const planRes = await fetch('/api/admin/create-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${name} - ${v.name}`,
                description: description,
                amount: vActualInrAmount,
                currency: 'INR',
                period: v.billingPeriod
              })
            });

            if (planRes.ok) {
              const planData = await planRes.json();
              versions[i].planId = planData.planId;
            } else {
              const errorData = await planRes.json().catch(() => ({}));
              alert(`Error creating Razorpay plan for version ${v.name}: ${errorData.error || 'Failed to create plan on Razorpay.'}`);
              setSaving(false);
              return;
            }
          }
        }
      }

      await addDoc(collection(db, "products"), {
        name,
        description,
        imageUrl: imageUrls[0] || '',
        imageUrls: imageUrls.filter(url => url.trim() !== ''),
        downloadUrl: hasVersions ? versions[0].assetUrl : assetUrl,
        videoUrl,
        presetList: presetList.split('\n').map(t => t.trim()).filter(t => t),
        features: features.filter(f => f.title || f.description || f.imageUrl),
        price: hasVersions ? parseFloat(versions[0].price) : parseFloat(price),
        inrPrice: hasVersions ? (versions[0].inrPrice !== '' ? parseFloat(versions[0].inrPrice) : null) : (inrPrice !== '' ? parseFloat(inrPrice) : null),
        salePrice: hasVersions ? (versions[0].salePrice !== '' ? parseFloat(versions[0].salePrice) : null) : (salePrice !== '' ? parseFloat(salePrice) : null),
        inrSalePrice: hasVersions ? (versions[0].inrSalePrice !== '' ? parseFloat(versions[0].inrSalePrice) : null) : (inrSalePrice !== '' ? parseFloat(inrSalePrice) : null),
        stockStatus: hasVersions ? versions[0].stockStatus : stockStatus,
        hasVersions,
        versions: hasVersions ? versions.map(v => ({
           id: v.id,
           name: v.name,
           price: parseFloat(v.price),
           salePrice: v.salePrice !== '' ? parseFloat(v.salePrice) : null,
           inrPrice: v.inrPrice !== '' ? parseFloat(v.inrPrice) : null,
           inrSalePrice: v.inrSalePrice !== '' ? parseFloat(v.inrSalePrice) : null,
           assetUrl: v.assetUrl,
           stockStatus: v.stockStatus,
           isSubscription: v.isSubscription || false,
           billingPeriod: v.isSubscription ? v.billingPeriod : null,
           planId: v.isSubscription ? v.planId : null
        })) : [],
        category,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        requiresLicense,
        isSubscription: hasVersions ? false : isSubscription,
        billingPeriod: (hasVersions || !isSubscription) ? null : billingPeriod,
        planId: (hasVersions || !isSubscription) ? null : planId,
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

  const textMuted = 'var(--text-muted)';
  const primaryCoverImage = imageUrls.find(u => u.trim() !== '') || '';
  const displayPriceUSD = price ? `$${parseFloat(price).toFixed(2)}` : '$0.00';
  const displayPriceINR = inrPrice ? `₹${parseFloat(inrPrice).toFixed(2)}` : '';
  const displaySaleUSD = salePrice ? `$${parseFloat(salePrice).toFixed(2)}` : '';

  return (
    <div className={styles.studioContainer}>
      
      {/* Studio Top Header */}
      <div className={styles.studioHeader}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumbs}>
            <Link href="/admin/products" className={styles.breadcrumbLink}>Products</Link>
            <span>/</span>
            <span>Add product</span>
          </div>
          <h1 className={styles.pageTitle}>{name || 'New Digital Product'}</h1>
        </div>

        <div className={styles.headerActions}>
          <Link href="/admin/products" className={styles.btnSecondary}>Discard</Link>
          <button className={styles.btnPrimary} onClick={handlePublish} disabled={saving}>
            {saving ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                Publishing...
              </>
            ) : (
              'Publish product'
            )}
          </button>
        </div>
      </div>

      {/* Studio Segmented Tabs */}
      <div className={styles.studioTabs}>
        {[
          { id: 'product', label: '📦 Product' },
          { id: 'content', label: '📁 Content' },
          { id: 'receipt', label: '🧾 Receipt' },
          { id: 'share', label: '🔗 Share' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'receipt') setPreviewMode('receipt');
              else if (tab.id === 'product') setPreviewMode('store');
            }}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Split Grid */}
      <div className={styles.studioGrid}>
        
        {/* Left Column: Form & Configuration */}
        <div className={styles.formColumn}>
          
          {/* TAB: PRODUCT */}
          {activeTab === 'product' && (
            <>
              {/* Basic Information Card */}
              <div className={styles.sectionCard}>
                <h3 className={styles.cardHeading}>Basic Details</h3>
                <p className={styles.cardSubtitle}>Name, description, and core product overview.</p>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Product Title *</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    placeholder="e.g. Dynamic Island for Windows | macOS-Style Experience" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Product Description *</label>
                  <textarea 
                    className={styles.textarea}
                    placeholder="Describe what makes this asset amazing, what's included, and how to use it..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                  />
                </div>
              </div>

              {/* Cover Images & Media Card */}
              <div className={styles.sectionCard}>
                <h3 className={styles.cardHeading}>Cover & Media Assets</h3>
                <p className={styles.cardSubtitle}>Upload high-resolution preview images for store listings.</p>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Display Image URLs</label>
                  {imageUrls.map((url, index) => (
                    <div key={index} className={styles.imageRow}>
                      {url.trim() ? (
                        <img src={url} alt="" className={styles.imagePreview} />
                      ) : (
                        <div className={styles.imagePreview} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted }}>🖼️</div>
                      )}
                      <input 
                        type="url" 
                        className={styles.input}
                        placeholder="https://images.unsplash.com/... or Cloudinary URL" 
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
                          className={styles.btnSecondary}
                          style={{ padding: '10px 16px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <button 
                    type="button"
                    onClick={() => setImageUrls([...imageUrls, ''])}
                    className={styles.btnSecondary}
                    style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                  >
                    + Add Another Image
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <span>Demo Video URL</span>
                    <span className={styles.optionalTag}>Optional</span>
                  </label>
                  <input 
                    type="url" 
                    className={styles.input}
                    placeholder="YouTube embed link or .mp4 URL" 
                    value={videoUrl} 
                    onChange={e => setVideoUrl(e.target.value)} 
                  />
                </div>
              </div>

              {/* Pricing & Monetization Card */}
              <div className={styles.sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className={styles.cardHeading}>Pricing & Monetization</h3>
                    <p className={styles.cardSubtitle}>Set USD and localized INR rates.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {!hasVersions && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={isSubscription} onChange={e => setIsSubscription(e.target.checked)} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                        Subscription
                      </label>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={hasVersions} onChange={e => setHasVersions(e.target.checked)} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                      Multiple Versions / Tiers
                    </label>
                  </div>
                </div>

                {!hasVersions ? (
                  <>
                    <div className={styles.priceGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Regular Price (USD) *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.input}
                          placeholder="$19.00" 
                          value={price} 
                          onChange={e => setPrice(e.target.value)} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          <span>Sale Price (USD)</span>
                          <span className={styles.optionalTag}>Optional</span>
                        </label>
                        <input 
                          type="number" 
                          step="0.01"
                          className={styles.input}
                          placeholder="$9.00" 
                          value={salePrice} 
                          onChange={e => setSalePrice(e.target.value)} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          <span>Regular Price (INR ₹)</span>
                          <span className={styles.optionalTag}>Optional</span>
                        </label>
                        <input 
                          type="number" 
                          className={styles.input}
                          placeholder="₹1499" 
                          value={inrPrice} 
                          onChange={e => setInrPrice(e.target.value)} 
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          <span>Sale Price (INR ₹)</span>
                          <span className={styles.optionalTag}>Optional</span>
                        </label>
                        <input 
                          type="number" 
                          className={styles.input}
                          placeholder="₹799" 
                          value={inrSalePrice} 
                          onChange={e => setInrSalePrice(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Stock Availability</label>
                      <select 
                        className={styles.select}
                        value={stockStatus}
                        onChange={e => setStockStatus(e.target.value)}
                      >
                        <option value="in_stock">In Stock (Instant Access)</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="offline">Offline / Hidden</option>
                      </select>
                    </div>

                    {isSubscription && (
                      <div style={{ background: 'rgba(0, 113, 227, 0.05)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(0, 113, 227, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>🔄 Recurring Auto-Debit Settings</div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Billing Cycle Period</label>
                          <select 
                            className={styles.select}
                            value={billingPeriod}
                            onChange={e => setBillingPeriod(e.target.value)}
                          >
                            <option value="monthly">Monthly Recurring</option>
                            <option value="yearly">Yearly Recurring</option>
                            <option value="weekly">Weekly Recurring</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Versions / Variations list */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {versions.map((version, idx) => (
                      <div key={version.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '20px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Version Tier #{idx + 1}</h4>
                          {versions.length > 1 && (
                            <button type="button" onClick={() => setVersions(versions.filter((_, i) => i !== idx))} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>Remove Tier</button>
                          )}
                        </div>

                        <div className={styles.priceGrid}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Tier Name *</label>
                            <input type="text" className={styles.input} value={version.name} onChange={e => {const v = [...versions]; v[idx].name = e.target.value; setVersions(v);}} placeholder="e.g. Personal / Commercial" />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Price (USD) *</label>
                            <input type="number" step="0.01" className={styles.input} value={version.price} onChange={e => {const v = [...versions]; v[idx].price = e.target.value; setVersions(v);}} placeholder="$29.00" />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Price (INR ₹)</label>
                            <input type="number" className={styles.input} value={version.inrPrice} onChange={e => {const v = [...versions]; v[idx].inrPrice = e.target.value; setVersions(v);}} placeholder="₹2499" />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Asset Download URL *</label>
                            <input type="url" className={styles.input} value={version.assetUrl} onChange={e => {const v = [...versions]; v[idx].assetUrl = e.target.value; setVersions(v);}} placeholder="https://drive.google.com/..." />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setVersions([...versions, { id: 'v' + (versions.length + 1), name: '', price: '', salePrice: '', inrPrice: '', inrSalePrice: '', assetUrl: '', stockStatus: 'in_stock', isSubscription: false, billingPeriod: 'monthly', planId: null }])} className={styles.btnSecondary} style={{ alignSelf: 'flex-start' }}>+ Add New Version Tier</button>
                  </div>
                )}
              </div>

              {/* Organization & Security Card */}
              <div className={styles.sectionCard}>
                <h3 className={styles.cardHeading}>Organization & DRM Security</h3>

                <div className={styles.priceGrid}>
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <label className={styles.label} style={{ margin: 0 }}>Category</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(!isCustomCategory)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0071E3',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {isCustomCategory ? '← Choose list' : '+ Custom Category'}
                      </button>
                    </div>

                    {isCustomCategory ? (
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Presets, Overlays, LUTs..."
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <select 
                        className={styles.select} 
                        value={PRESET_CATEGORIES.includes(category) ? category : '__custom__'} 
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setIsCustomCategory(true);
                          } else {
                            setCategory(e.target.value);
                          }
                        }}
                      >
                        {PRESET_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        {!PRESET_CATEGORIES.includes(category) && category && (
                          <option value={category}>{category}</option>
                        )}
                        <option value="__custom__">+ Write Custom Category...</option>
                      </select>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tags (comma separated)</label>
                    <input type="text" className={styles.input} placeholder="video, transitions, after-effects" value={tags} onChange={e => setTags(e.target.value)} />
                  </div>
                </div>

                <label className={styles.checkboxRow}>
                  <input 
                    type="checkbox" 
                    className={styles.checkboxInput}
                    checked={requiresLicense}
                    onChange={e => setRequiresLicense(e.target.checked)}
                  />
                  <div className={styles.checkboxContent}>
                    <div className={styles.checkboxTitle}>Generate Unique DRM License Keys</div>
                    <div className={styles.checkboxDesc}>When enabled, buyers automatically receive an authentic license key for in-app extension and plugin activation.</div>
                  </div>
                </label>
              </div>

              {/* Long-Form Highlights Card */}
              <div className={styles.sectionCard}>
                <h3 className={styles.cardHeading}>Landing Page Highlights</h3>
                <p className={styles.cardSubtitle}>Additional sales copy and feature bullets for the product page.</p>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <span>What's Included? (Preset / Feature List)</span>
                    <span className={styles.optionalTag}>One item per line</span>
                  </label>
                  <textarea 
                    className={styles.textarea}
                    placeholder="15+ Film Burns&#10;10+ Sound Effects&#10;Custom LUTs Pack&#10;Tutorial Video Included" 
                    value={presetList} 
                    onChange={e => setPresetList(e.target.value)} 
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB: CONTENT */}
          {activeTab === 'content' && (
            <div className={styles.sectionCard}>
              <h3 className={styles.cardHeading}>Digital Asset Delivery</h3>
              <p className={styles.cardSubtitle}>The files and direct download links delivered to customers upon payment.</p>

              {!hasVersions ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Asset Download URL * (Google Drive, Cloudinary, Dropbox)</label>
                  <input 
                    type="url" 
                    className={styles.input}
                    placeholder="https://drive.google.com/file/d/... or ZIP URL" 
                    value={assetUrl} 
                    onChange={e => setAssetUrl(e.target.value)} 
                  />
                  <div style={{ fontSize: '0.775rem', color: textMuted, marginTop: '4px' }}>
                    Buyers will receive a direct high-speed download button on their customer dashboard and email receipt.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: textMuted }}>
                  Download URLs are managed per version tier in the <b>Product</b> tab.
                </div>
              )}
            </div>
          )}

          {/* TAB: RECEIPT */}
          {activeTab === 'receipt' && (
            <div className={styles.sectionCard}>
              <h3 className={styles.cardHeading}>Customer Receipt & Delivery Notes</h3>
              <p className={styles.cardSubtitle}>Customize what customers see in their order confirmation email.</p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Download Button Text</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={receiptButtonText} 
                  onChange={e => setReceiptButtonText(e.target.value)} 
                  placeholder="Download Asset" 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Custom Thank-You Message</label>
                <textarea 
                  className={styles.textarea}
                  value={receiptMessage} 
                  onChange={e => setReceiptMessage(e.target.value)} 
                  placeholder="Thank you for purchasing! Your download is ready..." 
                />
              </div>
            </div>
          )}

          {/* TAB: SHARE */}
          {activeTab === 'share' && (
            <div className={styles.sectionCard}>
              <h3 className={styles.cardHeading}>Share & Embed Product</h3>
              <p className={styles.cardSubtitle}>Share links will become available as soon as this product is published.</p>
              <div style={{ color: textMuted, fontSize: '0.875rem' }}>
                Publish this product first to unlock shareable links and embed buttons.
              </div>
            </div>
          )}

        </div>


        {/* Right Column: Sticky Real-Time Interactive Live Preview */}
        <div className={styles.previewColumn}>
          <div className={styles.previewHeader}>
            <div className={styles.previewTitle}>
              <span>⚡</span> Live Preview
            </div>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '99px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setPreviewMode('store')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '99px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: previewMode === 'store' ? 'var(--bg-card)' : 'transparent',
                  color: previewMode === 'store' ? 'var(--text-primary)' : textMuted,
                  boxShadow: previewMode === 'store' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Store Card
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('receipt')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '99px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: previewMode === 'receipt' ? 'var(--bg-card)' : 'transparent',
                  color: previewMode === 'receipt' ? 'var(--text-primary)' : textMuted,
                  boxShadow: previewMode === 'receipt' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Receipt
              </button>
            </div>
          </div>

          {/* Interactive Mockup Device Frame */}
          <div className={styles.deviceFrame}>
            <div className={styles.deviceTopBar}>
              <div className={styles.deviceDot} style={{ background: '#ff5f56' }} />
              <div className={styles.deviceDot} style={{ background: '#ffbd2e' }} />
              <div className={styles.deviceDot} style={{ background: '#27c93f' }} />
              <div className={styles.deviceUrl}>crevostore.com/products/preview</div>
            </div>

            {previewMode === 'store' ? (
              <div>
                <div 
                  className={styles.previewCover} 
                  style={{ backgroundImage: primaryCoverImage ? `url(${primaryCoverImage})` : 'none' }}
                >
                  {!primaryCoverImage && <span style={{ color: textMuted, fontSize: '0.85rem' }}>No Cover Image</span>}
                  <div className={styles.previewBadge}>{category}</div>
                </div>

                <div className={styles.previewBody}>
                  <h4 className={styles.previewProductTitle}>{name || 'Product Title'}</h4>
                  
                  <div className={styles.previewPriceRow}>
                    <span className={styles.previewPrice}>{displayPriceUSD}</span>
                    {displaySaleUSD && <span className={styles.previewSalePrice}>{displaySaleUSD}</span>}
                    {displayPriceINR && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>({displayPriceINR})</span>}
                  </div>

                  <p className={styles.previewDesc}>
                    {description || 'Product description will appear here on your live storefront...'}
                  </p>

                  <button type="button" className={styles.previewBuyBtn}>
                    Add to Cart & Get Access
                  </button>
                </div>
              </div>
            ) : (
              /* Receipt Mockup */
              <div className={styles.receiptCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem' }}>
                  <span>✓</span> Payment Successful
                </div>

                <h4 className={styles.receiptHeading}>{name || 'Product Title'}</h4>

                <div className={styles.receiptItemRow}>
                  <span style={{ color: textMuted }}>Amount Paid</span>
                  <span style={{ fontWeight: 700 }}>{displayPriceUSD}</span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  {receiptMessage}
                </div>

                <button type="button" className={styles.previewBuyBtn} style={{ background: '#10B981' }}>
                  📥 {receiptButtonText}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
