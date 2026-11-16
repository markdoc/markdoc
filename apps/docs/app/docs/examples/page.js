import Content, { markdoc } from '../../../content/docs/examples/index.md';
import { pageMetadata } from '../../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/docs/examples');

export default Content;
