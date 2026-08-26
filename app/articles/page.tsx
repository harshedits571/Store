export const dynamic = 'force-dynamic';

import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default async function ArticlesPage() {
  let articles: any[] = [];
  try {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching articles:", error);
  }

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h1 className="h1" style={{ marginBottom: '16px' }}>Resources & Case Studies</h1>
        <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.125rem' }}>
          Explore our expert guides, real case studies, and insights tailored for professional creators.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {articles.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
            No articles published yet. Check back soon!
          </div>
        ) : (
          articles.map(article => (
            <Link key={article.id} href={`/articles/${article.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} className="article-card-hover">
                <div style={{ aspectRatio: '16/9', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  {article.imageUrl ? (
                    <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>📝 Article</div>
                  )}
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600 }}>{article.pillar}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.4' }}>{article.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {article.excerpt}
                  </p>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{article.author || 'Crevo Store'}</span>
                    <span>{article.createdAt ? new Date(article.createdAt.seconds * 1000).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .article-card-hover:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-primary);
        }
      `}} />
    </div>
  );
}
