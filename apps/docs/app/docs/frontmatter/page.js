import Content, { markdoc } from '../../../content/docs/frontmatter.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/frontmatter');

export default Content;
