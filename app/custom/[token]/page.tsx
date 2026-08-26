'use client';
import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function CustomLinkHandler({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const processToken = async () => {
      try {
        const cleanToken = resolvedParams.token.trim().toUpperCase();

        // 1. Check doc ID directly
        let linkData: any = null;
        const docRef = doc(db, 'custom_links', cleanToken);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          linkData = { id: docSnap.id, ...docSnap.data() };
        } else {
          // 2. Check by token field
          const q = query(collection(db, "custom_links"), where("token", "==", cleanToken));
          const snap = await getDocs(q);
          if (!snap.empty) {
            linkData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }

        if (!linkData) {
          setError(`Invalid or expired custom link "${cleanToken}".`);
          setLoading(false);
          return;
        }

        if (!linkData.active) {
          setError('This discount link is currently inactive.');
          setLoading(false);
          return;
        }

        if (linkData.maxRedemptions > 0 && (linkData.currentRedemptions || 0) >= linkData.maxRedemptions) {
          setError('This discount link has reached its maximum usage limit.');
          setLoading(false);
          return;
        }

        // Save to session storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('custom_link_ref', cleanToken);
        }

        // Smart Redirect:
        // If tied to a single product, open that product page directly with discount
        if (linkData.products && linkData.products.length === 1) {
          router.push(`/products/${linkData.products[0]}?ref=${cleanToken}`);
        } else if (linkData.productId) {
          router.push(`/products/${linkData.productId}?ref=${cleanToken}`);
        } else {
          // General store discount
          router.push(`/products?ref=${cleanToken}`);
        }

      } catch (err) {
        console.error(err);
        setError('An error occurred processing this link.');
        setLoading(false);
      }
    };

    processToken();
  }, [resolvedParams.token, router]);

  if (error) {
    return (
      <div className="container section" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '48px', maxWidth: '500px' }}>
          <h2 className="h2" style={{ color: 'var(--danger)', marginBottom: '16px' }}>Link Error</h2>
          <p className="text-secondary">{error}</p>
          <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => router.push('/products')}>Browse Catalog</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h2 className="h2 mb-4">Applying your special discount...</h2>
        <p className="text-secondary">Opening product page in a moment.</p>
      </div>
    </div>
  );
}
