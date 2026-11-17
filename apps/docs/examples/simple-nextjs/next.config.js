const withMarkdoc = require('@markdoc/next.js');

module.exports = withMarkdoc()({
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdoc'],
  turbopack: { root: __dirname }
});
