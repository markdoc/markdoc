const path = require('node:path');
const withMarkdoc = require('@markdoc/next.js');

module.exports = withMarkdoc()({
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..')
  },
  pageExtensions: ['js', 'md', 'mdoc'],
  i18n: {
    locales: ['en'],
    defaultLocale: 'en'
  },
  redirects() {
    return [
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
