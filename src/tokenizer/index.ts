import MarkdownIt from 'markdown-it/lib';
import annotations from './plugins/annotations';
import frontmatter from './plugins/frontmatter';
import comments from './plugins/comments';
import type Token from 'markdown-it/lib/token';

export default class Tokenizer {
  private parser: MarkdownIt;

  constructor(
    config: MarkdownIt.Options & {
      allowIndentation?: boolean;
      allowComments?: boolean;
    } = {}
  ) {
    // Default allowIndentation to true: markdoc already disables the indented
    // code_block rule, so there is no ambiguity between a tab-indented line
    // and a code block. Without this default, markdown-it's paragraph rule
    // skips terminator checks for lines whose visual indent >= 4 (e.g. a
    // single tab), causing tab-indented nested tags like `\t{% /tag %}` to
    // be swallowed into the preceding paragraph instead of being recognised
    // as block-level annotations. See https://github.com/markdoc/markdoc/issues/581
    this.parser = new MarkdownIt({
      allowIndentation: true,
      ...config,
    } as MarkdownIt.Options);
    this.parser.use(annotations, 'annotations', {});
    this.parser.use(frontmatter, 'frontmatter', {});
    this.parser.disable([
      'lheading',
      // Disable indented `code_block` support https://spec.commonmark.org/0.30/#indented-code-block
      'code',
    ]);

    if (config.allowComments) this.parser.use(comments, 'comments', {});
  }

  tokenize(content: string): Token[] {
    return this.parser.parse(content.toString(), {});
  }
}
