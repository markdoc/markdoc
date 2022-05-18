import MarkdownIt from 'markdown-it/lib';
import annotations from './plugins/annotations';
import frontmatter from './plugins/frontmatter';
import type Token from 'markdown-it/lib/token';
const footnotes = require('markdown-it-footnote');

export default class Tokenizer {
  private parser: MarkdownIt;

  constructor(
    config: MarkdownIt.Options & { allowIndentation?: boolean } = {}
  ) {
    this.parser = new MarkdownIt(config);
    this.parser.use(annotations, 'annotations', {});
    this.parser.use(frontmatter, 'frontmatter', {});
    this.parser.use(footnotes, 'footnotes', {});
    this.parser.disable('lheading');
  }

  tokenize(content: string): Token[] {
    return this.parser.parse(content.toString(), {});
  }
}
