'use client';
import { useEffect, useState, use } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCart } from '../../context/CartContext';
import { useRouter } from 'next/navigation';

export default function CustomLinkHandler({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart, clearCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    const processToken = async () => {
      try {
        const q = query(collection(db, "custom_links"), where("token", "==", resolvedParams.token.toUpperCase()));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError('Invalid or expired custom link.');
          setLoading(false);
          return;
        }

        const linkData = snap.docs[0].data();

        // Optional: clear cart before adding a custom link so it doesn't mix with other stuff?
        // Let's just add it to the cart normally so they can buy other things too.
        addToCart({
          id: linkData.productId,
          name: `${linkData.productName} (Special Price)`, // Label it clearly
          price: linkData.newPrice,
          category: linkData.category,
          requiresLicense: linkData.requiresLicense || false
        });

        // Redirect to checkout automatically
        router.push('/checkout');

      } catch (err) {
        console.error(err);
        setError('An error occurred processing this link.');
        setLoading(false);
      }
    };

    processToken();
  }, [resolvedParams.token, addToCart, router]);

  if (error) {
    return (
      <div className="container section" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '48px' }}>
          <h2 className="h2" style={{ color: 'var(--danger)', marginBottom: '16px' }}>Link Error</h2>
          <p className="text-secondary">{error}</p>
          <button className="btn-primary" style={{ marginTop: '24px' }} onClick={() => router.push('/products')}>Browse Store</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h2 className="h2 mb-4">Applying your special price...</h2>
        <p className="text-secondary">Redirecting to checkout in a moment.</p>
      </div>
    </div>
  );
}
