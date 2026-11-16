import Content, { markdoc } from '../../../content/docs/tags.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/tags');

export default Content;
