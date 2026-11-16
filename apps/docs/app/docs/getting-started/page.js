import Content, { markdoc } from '../../../content/docs/getting-started.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(
  markdoc.frontmatter,
  '/docs/getting-started'
);

export default Content;
