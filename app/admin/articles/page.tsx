'use client';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAdmin } from '../../context/AdminContext';

export default function AdminArticles() {
  const { articles } = useAdmin();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      try {
        await deleteDoc(doc(db, "articles", id));
      } catch (error) {
        console.error("Error deleting article:", error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="h2 mb-4">Manage Articles</h1>
          <p className="text-secondary">Publish content pillars (Case Studies, Guides, Q&A) for SEO.</p>
        </div>
        <Link href="/admin/articles/add" className="btn-primary">
          + Write New Article
        </Link>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Title</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Content Pillar</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!articles || articles.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center' }}>No articles found. Add one above.</td></tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>
                    {article.title}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: 'var(--bg-secondary)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                      {article.pillar || 'Uncategorized'}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {new Date(article.createdAt?.seconds * 1000).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <Link href={`/admin/articles/edit/${article.id}`} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', marginRight: '8px', textDecoration: 'none', display: 'inline-block' }}>Edit</Link>
                    <button className="btn-secondary" onClick={() => handleDelete(article.id)} style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete</button>
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
