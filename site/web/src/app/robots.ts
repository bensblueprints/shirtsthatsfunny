import type { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shirtthatsfunny.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here is useful in an index, and cart URLs are per-session.
      disallow: ['/api/', '/cart', '/checkout', '/order/'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
