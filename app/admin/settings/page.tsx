'use client';
import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '../../context/StoreContext';

export default function SettingsPage() {
  const { products } = useStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hero Section
  const [heroTitleLine1, setHeroTitleLine1] = useState('');
  const [heroTitleLine2, setHeroTitleLine2] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');

  // Bundle Section
  const [bundleBadge, setBundleBadge] = useState('');
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleSub, setBundleSub] = useState('');
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleInrOriginalPrice, setBundleInrOriginalPrice] = useState('');
  const [bundleInrPrice, setBundleInrPrice] = useState('');
  const [bundleItemsText, setBundleItemsText] = useState('');
  const [bundleProductIds, setBundleProductIds] = useState<string[]>([]);
  const [bundleBgUrl, setBundleBgUrl] = useState('');

  // Bio Section
  const [bioTitle, setBioTitle] = useState('');
  const [bioText1, setBioText1] = useState('');
  const [bioText2, setBioText2] = useState('');
  const [bioImageUrl, setBioImageUrl] = useState('');

  // Featured Products IDs
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);

  // FAQs
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);

  // Testimonials
  const [testimonials, setTestimonials] = useState<{ name: string; handle: string; text: string }[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "homepage"));
        if (snap.exists()) {
          const data = snap.data();
          setHeroTitleLine1(data.heroTitleLine1 || '');
          setHeroTitleLine2(data.heroTitleLine2 || '');
          setHeroSubtitle(data.heroSubtitle || '');
          
          setBundleBadge(data.bundleBadge || '');
          setBundleTitle(data.bundleTitle || '');
          setBundleSub(data.bundleSub || '');
          setBundleOriginalPrice(data.bundleOriginalPrice ? data.bundleOriginalPrice.toString() : '');
          setBundlePrice(data.bundlePrice ? data.bundlePrice.toString() : '');
          setBundleInrOriginalPrice(data.bundleInrOriginalPrice ? data.bundleInrOriginalPrice.toString() : '');
          setBundleInrPrice(data.bundleInrPrice ? data.bundleInrPrice.toString() : '');
          setBundleItemsText(data.bundleItems ? data.bundleItems.join('\n') : '');
          setBundleProductIds(data.bundleProductIds || []);
          setBundleBgUrl(data.bundleBgUrl || '');

          setBioTitle(data.bioTitle || '');
          setBioText1(data.bioText1 || '');
          setBioText2(data.bioText2 || '');
          setBioImageUrl(data.bioImageUrl || '');

          setFeaturedProductIds(data.featuredProductIds || []);
          setFaqs(data.faqs || []);
          setTestimonials(data.testimonials || []);
        }
      } catch (err) {
        console.error("Error loading homepage settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const bundleItems = bundleItemsText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item);

    try {
      await setDoc(doc(db, "settings", "homepage"), {
        heroTitleLine1,
        heroTitleLine2,
        heroSubtitle,
        bundleBadge,
        bundleTitle,
        bundleSub,
        bundleOriginalPrice: parseFloat(bundleOriginalPrice) || 0,
        bundlePrice: parseFloat(bundlePrice) || 0,
        bundleInrOriginalPrice: parseFloat(bundleInrOriginalPrice) || null,
        bundleInrPrice: parseFloat(bundleInrPrice) || null,
        bundleItems,
        bundleProductIds,
        bundleBgUrl,
        bioTitle,
        bioText1,
        bioText2,
        bioImageUrl,
        featuredProductIds,
        faqs,
        testimonials
      }, { merge: true });

      alert("Homepage settings updated successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to toggle featured product selection
  const handleProductToggle = (productId: string) => {
    if (featuredProductIds.includes(productId)) {
      setFeaturedProductIds(featuredProductIds.filter(id => id !== productId));
    } else {
      setFeaturedProductIds([...featuredProductIds, productId]);
    }
  };

  // Helper to toggle bundle product selection
  const handleBundleProductToggle = (productId: string) => {
    if (bundleProductIds.includes(productId)) {
      setBundleProductIds(bundleProductIds.filter(id => id !== productId));
    } else {
      setBundleProductIds([...bundleProductIds, productId]);
    }
  };

  // Helper for dynamic FAQs list
  const handleAddFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
  const handleRemoveFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index));
  const handleFaqChange = (index: number, field: 'q' | 'a', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  // Helper for dynamic Testimonials list
  const handleAddTestimonial = () => setTestimonials([...testimonials, { name: '', handle: '', text: '' }]);
  const handleRemoveTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index));
  const handleTestimonialChange = (index: number, field: 'name' | 'handle' | 'text', value: string) => {
    const updated = [...testimonials];
    updated[index][field] = value;
    setTestimonials(updated);
  };

  const panelBg = 'var(--bg-card)';
  const borderColor = 'var(--border-subtle)';
  const textMuted = 'var(--text-muted)';

  if (loading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: textMuted }}>Loading settings...</div>;
  }

  return (
    <div style={{ paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2">Homepage Settings</h1>
          <p className="text-secondary">Customize your storefront headers, bundles, FAQs, and bio.</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ padding: '12px 32px' }}>
          {saving ? "Saving Changes..." : "Save Settings"}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* 1. Hero Section Settings */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>1. Hero Banner Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Hero Title Line 1 (Gradient Text)</label>
              <input type="text" className="input-field" value={heroTitleLine1} onChange={e => setHeroTitleLine1(e.target.value)} placeholder="e.g. Spend less time editing," />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Hero Title Line 2 (White Text)</label>
              <input type="text" className="input-field" value={heroTitleLine2} onChange={e => setHeroTitleLine2(e.target.value)} placeholder="e.g. More time living." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Hero Subtitle</label>
              <textarea className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)} placeholder="Enter subtitle details..." />
            </div>
          </div>
        </div>

        {/* 2. Bundle Offer Settings */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>2. All-In-One Bundle</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Badge Text (Yellow Highlights)</label>
                <input type="text" className="input-field" value={bundleBadge} onChange={e => setBundleBadge(e.target.value)} placeholder="⚡ Value $370+ for cheap ⚡" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Bundle Title</label>
                <input type="text" className="input-field" value={bundleTitle} onChange={e => setBundleTitle(e.target.value)} placeholder="ALL IN ONE CREATIVE SUITE" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Bundle Subtitle/Description</label>
              <textarea className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} value={bundleSub} onChange={e => setBundleSub(e.target.value)} placeholder="Get instant lifetime access to our entire premium library..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Background Image URL (Optional)</label>
              <input type="text" className="input-field" value={bundleBgUrl} onChange={e => setBundleBgUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Original Price ($)</label>
                <input type="number" step="0.01" className="input-field" value={bundleOriginalPrice} onChange={e => setBundleOriginalPrice(e.target.value)} placeholder="370.00" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Sale Price ($)</label>
                <input type="number" step="0.01" className="input-field" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="195.00" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Original Price (INR) *Optional*</label>
                <input type="number" className="input-field" value={bundleInrOriginalPrice} onChange={e => setBundleInrOriginalPrice(e.target.value)} placeholder="₹" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 500, color: textMuted }}>Sale Price (INR) *Optional*</label>
                <input type="number" className="input-field" value={bundleInrPrice} onChange={e => setBundleInrPrice(e.target.value)} placeholder="₹" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Bundle Features List (One item per line)</label>
              <textarea className="input-field" style={{ minHeight: '100px', resize: 'vertical' }} value={bundleItemsText} onChange={e => setBundleItemsText(e.target.value)} placeholder="e.g.&#10;All Premium Plugins&#10;Visual Transitions Pack&#10;Cinematic SFX" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', borderTop: `1px solid ${borderColor}`, paddingTop: '16px' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Select Products to include in this Bundle</label>
              <p style={{ color: textMuted, fontSize: '0.875rem' }}>These products will be instantly accessible to the user when they purchase the bundle.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {products.map(prod => (
                  <label key={`bundle-${prod.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: `1px solid ${borderColor}`, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={bundleProductIds.includes(prod.id)} 
                      onChange={() => handleBundleProductToggle(prod.id)}
                      style={{ width: '18px', height: '18px', accentColor: '#a855f7' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: textMuted }}>${Number(prod.price).toFixed(2)}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Featured Products Selector */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>3. Featured Products</h3>
          <p style={{ color: textMuted, fontSize: '0.875rem', marginBottom: '20px' }}>Select products to display on the homepage grid (leave all unchecked to display your first 6 products automatically).</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {products.map(prod => (
              <label key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: `1px solid ${borderColor}`, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={featuredProductIds.includes(prod.id)} 
                  onChange={() => handleProductToggle(prod.id)}
                  style={{ width: '18px', height: '18px', accentColor: '#3B82F6' }}
                />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{prod.name}</div>
                  <div style={{ fontSize: '0.75rem', color: textMuted }}>${Number(prod.price).toFixed(2)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Creator Bio Section */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>4. Creator Biography</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Bio Title</label>
              <input type="text" className="input-field" value={bioTitle} onChange={e => setBioTitle(e.target.value)} placeholder="WHO IS ASIM?" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Paragraph 1</label>
              <textarea className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} value={bioText1} onChange={e => setBioText1(e.target.value)} placeholder="Introductory bio details..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Paragraph 2</label>
              <textarea className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} value={bioText2} onChange={e => setBioText2(e.target.value)} placeholder="Additional story details..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 500, color: textMuted }}>Bio Image URL</label>
              <input type="url" className="input-field" value={bioImageUrl} onChange={e => setBioImageUrl(e.target.value)} placeholder="https://example.com/your-image.png" />
            </div>
          </div>
        </div>

        {/* 5. FAQs Management */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>5. FAQs Accordion</h3>
            <button type="button" onClick={handleAddFaq} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>+ Add Question</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {faqs.map((faq, index) => (
              <div key={index} style={{ border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Q{index + 1}:</span>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={faq.q} 
                    onChange={e => handleFaqChange(index, 'q', e.target.value)} 
                    placeholder="Enter question here..."
                  />
                  <button type="button" onClick={() => handleRemoveFaq(index)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9rem', marginTop: '12px' }}>A:</span>
                  <textarea 
                    className="input-field" 
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={faq.a} 
                    onChange={e => handleFaqChange(index, 'a', e.target.value)} 
                    placeholder="Enter answer here..."
                  />
                </div>
              </div>
            ))}
            {faqs.length === 0 && <div style={{ textAlign: 'center', color: textMuted, padding: '16px' }}>No FAQs added. Click "+ Add Question" to add one.</div>}
          </div>
        </div>

        {/* 6. Testimonials Management */}
        <div style={{ background: panelBg, borderRadius: '8px', border: `1px solid ${borderColor}`, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>6. Customer Testimonials</h3>
            <button type="button" onClick={handleAddTestimonial} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>+ Add Testimonial</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {testimonials.map((test, index) => (
              <div key={index} style={{ border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Testimonial #{index + 1}</span>
                  <button type="button" onClick={() => handleRemoveTestimonial(index)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={test.name} 
                    onChange={e => handleTestimonialChange(index, 'name', e.target.value)} 
                    placeholder="Full Name"
                  />
                  <input 
                    type="text" 
                    className="input-field" 
                    value={test.handle} 
                    onChange={e => handleTestimonialChange(index, 'handle', e.target.value)} 
                    placeholder="@handle"
                  />
                </div>
                <textarea 
                  className="input-field" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={test.text} 
                  onChange={e => handleTestimonialChange(index, 'text', e.target.value)} 
                  placeholder="Testimonial text..."
                />
              </div>
            ))}
            {testimonials.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: textMuted, padding: '16px' }}>No testimonials added. Click "+ Add Testimonial" to add one.</div>}
          </div>
        </div>

      </form>
    </div>
  );
}
