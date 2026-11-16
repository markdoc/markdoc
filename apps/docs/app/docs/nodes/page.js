import Content, { markdoc } from '../../../content/docs/nodes.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/nodes');

export default Content;
