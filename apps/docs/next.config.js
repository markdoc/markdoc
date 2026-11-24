const path = require('node:path');
const withMarkdoc = require('@markdoc/next.js');

module.exports = withMarkdoc()({
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  turbopack: { root: path.join(__dirname, '../..') },
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
