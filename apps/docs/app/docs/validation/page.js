import Content, { markdoc } from '../../../content/docs/validation.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/validation');

export default Content;
