import Content, { markdoc } from '../../../content/docs/attributes.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/attributes');

export default Content;
