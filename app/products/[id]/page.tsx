import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ProductClient from './ProductClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const docRef = doc(db, 'products', resolvedParams.id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return {
      title: 'Product Not Found | Crevo Store'
    };
  }

  const product = docSnap.data();
  const imageUrl = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : (product.imageUrl || '');

  return {
    title: `${product.name} | Crevo Store`,
    description: product.description || `Buy ${product.name} at Crevo Store. Premium quality assets designed to elevate your workflow.`,
    openGraph: {
      type: 'website',
      title: `${product.name} | Crevo Store`,
      description: product.description || `Buy ${product.name} at Crevo Store. Premium quality assets designed to elevate your workflow.`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const docRef = doc(db, 'products', resolvedParams.id);
  const docSnap = await getDoc(docRef);
  let schemaHtml = '';

  if (docSnap.exists()) {
    const product = docSnap.data();
    const imageUrl = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : (product.imageUrl || '');
    
    schemaHtml = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": imageUrl ? [imageUrl] : [],
      "description": product.description || `Buy ${product.name} at Crevo Store.`,
      "brand": {
        "@type": "Brand",
        "name": "Crevo Store"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://www.crevostore.com/products/${resolvedParams.id}`,
        "priceCurrency": "USD",
        "price": product.salePrice || product.price || 0,
        "availability": "https://schema.org/InStock"
      }
    });
  }

  return (
    <>
      {schemaHtml && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaHtml }}
        />
      )}
      <ProductClient params={params} />
    </>
  );
}
