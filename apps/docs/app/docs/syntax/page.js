import Content, { markdoc } from '../../../content/docs/syntax.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/syntax');

export default Content;
