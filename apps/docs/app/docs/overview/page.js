import Content, { markdoc } from '../../../content/docs/overview.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/overview');

export default Content;
