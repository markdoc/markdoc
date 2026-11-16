import Content, { markdoc } from '../../../content/docs/partials.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/partials');

export default Content;
