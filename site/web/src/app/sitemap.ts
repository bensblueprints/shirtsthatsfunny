import type { MetadataRoute } from 'next';

import { getAllSlugs } from '@/lib/woo';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shirtthatsfunny.com';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site}/sizing`, changeFrequency: 'monthly', priority: 0.6 },
    ...['about', 'shipping', 'returns', 'privacy', 'terms'].map((slug) => ({
      url: `${site}/pages/${slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];

  try {
    const slugs = await getAllSlugs();
    return [
      ...staticRoutes,
      ...slugs.map((slug) => ({
        url: `${site}/product/${slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A sitemap without products beats a 500 on /sitemap.xml.
    return staticRoutes;
  }
}
