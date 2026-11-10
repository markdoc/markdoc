import Markdoc, { Tokenizer, renderers } from '@markdoc/markdoc';
import type {
  MarkdownRenderHandler,
  MarkdownRenderOptions,
  Token,
  TokenizerOptions,
} from '@markdoc/markdoc';

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
  Markdoc.transform(Markdoc.parse(tokens))
);

// @ts-expect-error markdown-it options retain their declared types.
new Tokenizer({ breaks: 'yes' });

// @ts-expect-error Markdoc options retain their declared types.
new Tokenizer({ allowIndentation: 'yes' });

const transformed = Markdoc.transform(Markdoc.parse(tokens));
const callout: MarkdownRenderHandler = (tag, { renderChildren }) =>
  new Markdoc.Ast.Node('blockquote', {}, renderChildren(tag.children));
const markdownOptions: MarkdownRenderOptions = {
  handlers: { Callout: callout, Layout: 'children', CopyButton: 'none' },
};
export const markdown: string = Markdoc.renderers.md(
  transformed,
  markdownOptions
);
export const namedMarkdown: string = renderers.md(transformed);

// @ts-expect-error Markdown handlers return AST nodes, not strings.
renderers.md(transformed, { handlers: { Bad: () => '**bold**' } });

// @ts-expect-error Markdown handler shortcuts are 'children' or 'none'.
renderers.md(transformed, { handlers: { Bad: 'skip' } });
