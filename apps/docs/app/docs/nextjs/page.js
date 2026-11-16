import Content, { markdoc } from '../../../content/docs/nextjs.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/nextjs');

export default Content;
