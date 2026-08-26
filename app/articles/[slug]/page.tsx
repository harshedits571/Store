import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const q = query(collection(db, "articles"), where("slug", "==", resolvedParams.slug));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    return { title: 'Article Not Found | Crevo Store' };
  }

  const article = snap.docs[0].data();
  return {
    title: `${article.title} | Crevo Store`,
    description: article.excerpt || `Read this ${article.pillar} at Crevo Store.`,
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      images: article.imageUrl ? [{ url: article.imageUrl }] : [],
    }
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const q = query(collection(db, "articles"), where("slug", "==", resolvedParams.slug));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    return <div className="container section" style={{ textAlign: 'center', padding: '100px 0' }}>Article not found.</div>;
  }

  const article = snap.docs[0].data();
  const datePublished = article.createdAt ? new Date(article.createdAt.seconds * 1000).toISOString() : new Date().toISOString();

  const schemaHtml = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "image": article.imageUrl ? [article.imageUrl] : [],
    "datePublished": datePublished,
    "dateModified": datePublished,
    "author": [{
      "@type": "Person",
      "name": article.author || "Crevo Store",
      "url": "https://www.crevostore.com"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "Crevo Store",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.crevostore.com/logo.png"
      }
    },
    "description": article.excerpt
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaHtml }} />
      <div className="container section" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '64px', paddingBottom: '120px' }}>
        <Link href="/articles" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
          ← Back to Articles
        </Link>
        
        <div style={{ marginBottom: '16px' }}>
          <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '6px 14px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700 }}>
            {article.pillar}
          </span>
        </div>

        <h1 className="h1" style={{ fontSize: '3rem', lineHeight: '1.2', marginBottom: '24px' }}>
          {article.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', marginBottom: '48px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
              {(article.author || 'C')[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{article.author || 'Crevo Store'}</div>
              <div style={{ fontSize: '0.85rem' }}>{new Date(datePublished).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {article.imageUrl && (
          <div style={{ marginBottom: '48px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <img src={article.imageUrl} alt={article.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        )}

        <div 
          style={{ fontSize: '1.125rem', lineHeight: '1.8', color: 'var(--text-secondary)', fontFamily: 'var(--font-inter)' }}
          dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }} 
        />
      </div>
    </>
  );
}
