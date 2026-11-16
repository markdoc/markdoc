import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL } from '../lib/metadata';

export default async function sitemap() {
  const files = await readdir(path.join(process.cwd(), 'content'), {
    recursive: true
  });
  const routes = files
    .filter((file) => file.endsWith('.md'))
    .map((file) =>
      `/${file.split(path.sep).join('/')}`
        .replace(/\.md$/, '')
        .replace(/\/index$/, '')
    );

  return [...routes, '/spec'].sort().map((route) => ({
    url: `${SITE_URL}${route || '/'}`,
    changeFrequency: 'daily',
    priority: 0.7
  }));
}
