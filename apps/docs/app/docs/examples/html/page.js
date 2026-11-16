import Content, { markdoc } from '../../../../content/docs/examples/html.md';
import { pageMetadata } from '../../../../lib/metadata.js';

export const metadata = pageMetadata(
  markdoc.frontmatter,
  '/docs/examples/html'
);

export default Content;
