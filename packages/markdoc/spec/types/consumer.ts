import type { Token, TokenizerOptions } from '@markdoc/markdoc';
import Markdoc, { Tokenizer } from '@markdoc/markdoc';

const options: TokenizerOptions = {
  html: false,
  breaks: true,
  quotes: ['\u201c', '\u201d', '\u2018', '\u2019'],
  highlight: (content, language, attributes) =>
    `${language}:${attributes}:${content}`,
  allowIndentation: true,
  allowComments: true,
  allowLinkValidation: true,
  linkValidationOptions: { validatedProtocols: ['https'] },
};
const tokenizer = new Tokenizer(options);

export const tokens: Token[] = tokenizer.tokenize('# Hello');
export const html: string = Markdoc.renderers.html(
  Markdoc.transform(Markdoc.parse(tokens)),
);

// @ts-expect-error markdown-it options retain their declared types.
new Tokenizer({ breaks: 'yes' });

// @ts-expect-error Markdoc options retain their declared types.
new Tokenizer({ allowIndentation: 'yes' });
