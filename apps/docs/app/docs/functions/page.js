import Content, { markdoc } from '../../../content/docs/functions.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/functions');

export default Content;
