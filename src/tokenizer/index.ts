import MarkdownIt from 'markdown-it';
import annotations from './plugins/annotations';
import frontmatter from './plugins/frontmatter';
import comments from './plugins/comments';
import link from './plugins/link';
import type { Token } from '../types';

export type LinkPluginOptions = { validatedProtocols: string[] };

export default class Tokenizer {
  private parser: MarkdownIt.MarkdownIt;

  constructor(
    config: MarkdownIt.MarkdownItOptions & {
      allowIndentation?: boolean;
      allowComments?: boolean;
      allowLinkValidation?: boolean;
      linkValidationOptions?: LinkPluginOptions;
    } = {}
  ) {
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
