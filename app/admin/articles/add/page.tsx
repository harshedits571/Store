'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CONTENT_PILLARS = [
  "Q&A Format Content",
  "Real Experience & Personal Stories",
  "Case Studies & Success Stories",
  "Original Insights & Opinions",
  "Industry Statistics & Research Data",
  "Step-by-Step Guides & Tutorials",
  "Expert Interviews & Quotes",
  "Detailed Comparisons (X vs Y)",
  "Unique Frameworks & Methodologies",
  "Real Examples & Use Cases"
];

export default function AddArticle() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    pillar: CONTENT_PILLARS[0],
    excerpt: '',
    content: '',
    imageUrl: '',
    author: 'Crevo Store'
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from title if slug isn't manually edited yet
      ...(name === 'title' && !prev.slug ? { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') } : {})
    }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      alert("Title, Slug, and Content are required.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "articles"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      router.push('/admin/articles');
    } catch (error) {
      console.error("Error adding article:", error);
      alert("Failed to save article.");
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Link href="/admin/articles" className="btn-secondary" style={{ padding: '8px 16px', textDecoration: 'none' }}>← Back</Link>
        <h1 className="h2" style={{ margin: 0 }}>Write New Article</h1>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div>
          <label className="input-label">Title</label>
          <input type="text" name="title" className="input-field" value={formData.title} onChange={handleChange} placeholder="e.g. How to edit faster in Premiere Pro" />
        </div>

        <div>
          <label className="input-label">Slug (URL)</label>
          <input type="text" name="slug" className="input-field" value={formData.slug} onChange={handleChange} placeholder="e.g. how-to-edit-faster" />
        </div>

        <div>
          <label className="input-label">Content Pillar (SEO Category)</label>
          <select name="pillar" className="input-field" value={formData.pillar} onChange={handleChange}>
            {CONTENT_PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="input-label">Author</label>
          <input type="text" name="author" className="input-field" value={formData.author} onChange={handleChange} />
        </div>

        <div>
          <label className="input-label">Thumbnail Image URL (Optional)</label>
          <input type="text" name="imageUrl" className="input-field" value={formData.imageUrl} onChange={handleChange} />
        </div>

        <div>
          <label className="input-label">Excerpt (Short SEO Description)</label>
          <textarea name="excerpt" className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} value={formData.excerpt} onChange={handleChange} />
        </div>

        <div>
          <label className="input-label">Main Content (Markdown or HTML)</label>
          <textarea name="content" className="input-field" style={{ minHeight: '300px', resize: 'vertical', fontFamily: 'monospace' }} value={formData.content} onChange={handleChange} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish Article'}
          </button>
        </div>
      </div>
    </div>
  );
}
