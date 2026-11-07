import MarkdownIt from 'markdown-it';
import type { MarkdownIt as MarkdownItParser } from 'markdown-it';
import annotations from './plugins/annotations';
import frontmatter from './plugins/frontmatter';
import comments from './plugins/comments';
import link from './plugins/link';
import type { Token } from '../types';

export type LinkPluginOptions = { validatedProtocols: string[] };

// Keep public options independent of the bundled parser's type dependencies.
// spec/types/tokenizer-options.ts checks compatibility with markdown-it.
export type TokenizerOptions = {
  html?: boolean;
  xhtmlOut?: boolean;
  breaks?: boolean;
  langPrefix?: string;
  linkify?: boolean;
  typographer?: boolean;
  quotes?: string | string[];
  highlight?:
    | ((content: string, language: string, attributes: string) => string)
    | null;
  maxNesting?: number;
  allowIndentation?: boolean;
  allowComments?: boolean;
  allowLinkValidation?: boolean;
  linkValidationOptions?: LinkPluginOptions;
};

export default class Tokenizer {
  private parser: MarkdownItParser;

  constructor(config: TokenizerOptions = {}) {
    this.parser = new MarkdownIt(config);
    this.parser.use(annotations);
    this.parser.use(frontmatter);

    this.parser.disable([
      'lheading',
      // Disable indented `code_block` support https://spec.commonmark.org/0.30/#indented-code-block
      'code',
    ]);

    if (config.allowComments) this.parser.use(comments);
    if (config.allowLinkValidation) {
      // Set http and https as the default protocols to validate
      this.parser.use(
        link,
        config.linkValidationOptions ?? {
          validatedProtocols: ['http', 'https'],
        }
      );
    }
  }

  tokenize(content: string): Token[] {
    return this.parser.parse(content.toString(), {});
  }
}
