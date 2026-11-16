import Content, { markdoc } from '../../../content/docs/render.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/render');

export default Content;
