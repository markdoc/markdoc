import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/metadata';
import { getPageRoutes } from '../lib/pages';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getPageRoutes();

  return [...routes, '/spec'].sort().map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: 'daily',
    priority: 0.7
  }));
}
