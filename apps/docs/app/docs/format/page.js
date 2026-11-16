import Content, { markdoc } from '../../../content/docs/format.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/format');

export default Content;
