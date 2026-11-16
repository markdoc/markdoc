import Content, { markdoc } from '../../../../content/docs/examples/react.md';
import { pageMetadata } from '../../../../lib/metadata.js';

export const metadata = pageMetadata(
  markdoc.frontmatter,
  '/docs/examples/react'
);

export default Content;
