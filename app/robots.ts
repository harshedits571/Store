import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout/', '/success/'],
    },
    sitemap: 'https://www.crevostore.com/sitemap.xml',
  }
}
