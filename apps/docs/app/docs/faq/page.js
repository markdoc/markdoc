import Content, { markdoc } from '../../../content/docs/faq.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/faq');

export default Content;
