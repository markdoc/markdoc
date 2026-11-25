import withMarkdoc from '@markdoc/next.js';

export default withMarkdoc()({
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdoc'],
  turbopack: { root: import.meta.dirname },
});
