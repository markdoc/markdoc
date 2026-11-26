import path from 'node:path';
import withMarkdoc from '@markdoc/next.js';
import { getPageRoutes } from './lib/pages';

const skillDiscovery = '</.well-known/skills/index.json>; rel="service-meta"';

export default withMarkdoc()({
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  turbopack: { root: path.join(import.meta.dirname, '../..') },
  pageExtensions: ['js', 'ts', 'tsx', 'md', 'mdoc'],
  async headers() {
    const routes = await getPageRoutes(import.meta.dirname);
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Link', value: skillDiscovery }]
      },
      // Next.js does not append a route handler's Link header to a configured one.
      // Include the canonical URL for both HTML pages and their Markdown aliases.
      ...routes.flatMap((route) => {
        const sources = route === '/'
          ? ['/', '/index.md', '/.md', '/markdoc']
          : [route, `${route}.md`, `/markdoc${route}`];
        return sources.map((source) => ({
          source,
          headers: [{
            key: 'Link',
            value: `<${route}>; rel="canonical", ${skillDiscovery}`
          }]
        }));
      }),
      {
        source: '/llms.txt',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }]
      }
    ];
  },
  redirects() {
    return [
      {
        source: '/en/:path*',
        destination: '/:path*',
        permanent: true
      },
      {
        source: '/docs',
        destination: '/docs/getting-started',
        permanent: false
      },
      {
        source: '/docs/nextjs',
        destination: '/docs/examples/nextjs',
        permanent: true
      }
    ];
  },
  rewrites() {
    return [
      {
        source: '/spec',
        destination: '/spec.html'
      }
    ];
  }
});
