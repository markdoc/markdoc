import path from 'node:path';
import withMarkdoc from '@markdoc/next.js';

export default withMarkdoc()({
  reactStrictMode: true,
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  turbopack: { root: path.join(import.meta.dirname, '../..') },
  pageExtensions: ['js', 'ts', 'tsx', 'md', 'mdoc'],
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
