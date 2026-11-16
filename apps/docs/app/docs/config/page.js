import Content, { markdoc } from '../../../content/docs/config.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/config');

export default Content;
