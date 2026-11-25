import type { MetadataRoute } from 'next';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from '../lib/metadata';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const files = await readdir(path.join(process.cwd(), 'app'), {
    recursive: true
  });
  const routes = files
    .filter((file) => path.basename(file) === 'page.md')
    .map((file) =>
      `/${file.split(path.sep).join('/')}`.replace(/\/page\.md$/, '')
    );

  return [...routes, '/spec'].sort().map((route) => ({
    url: `${SITE_URL}${route || '/'}`,
    changeFrequency: 'daily',
    priority: 0.7
  }));
}
