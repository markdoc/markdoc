import Content, { markdoc } from '../../content/sandbox.md';
import { pageMetadata } from '../../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/sandbox');

export default Content;
