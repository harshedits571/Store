import { MetadataRoute } from 'next'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.crevostore.com'

  // Get all products from Firestore
  let productUrls: MetadataRoute.Sitemap = []
  try {
    const querySnapshot = await getDocs(collection(db, "products"))
    productUrls = querySnapshot.docs.map((doc) => ({
      url: `${baseUrl}/products/${doc.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  } catch (error) {
    console.error("Error generating sitemap for products:", error)
  }

  // Base routes
  const routes = ['', '/products', '/contact', '/faq'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.9,
  }))

  return [...routes, ...productUrls]
}
