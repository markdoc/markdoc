import Content, { markdoc } from '../content/index.md';
import { pageMetadata } from '../lib/metadata.js';

export const metadata = pageMetadata(markdoc.frontmatter, '/');

export default Content;
