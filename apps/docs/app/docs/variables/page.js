import Content, { markdoc } from '../../../content/docs/variables.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/variables');

export default Content;
