import type { MarkdownRenderHandler } from '@markdoc/markdoc';
import { Ast } from '@markdoc/markdoc';
import { markdownHref } from '../lib/markdown-link';
import { SITE_URL } from '../lib/metadata';

// Markdown handlers for components, keyed like the components the plugin renders
export default {
  a: (tag, { renderChildren }) =>
    new Ast.Node(
      'link',
      {
        href: typeof tag.attributes.href === 'string'
          ? markdownHref(tag.attributes.href, SITE_URL)
          : tag.attributes.href,
        title: tag.attributes.title
      },
      renderChildren(tag.children)
    ),
  Agents: 'children',
  Humans: 'none',
  Callout: (tag, { renderChildren }) => {
    const children = renderChildren(tag.children);
    const { title } = tag.attributes;
    return new Ast.Node(
      'blockquote',
      {},
      title
        ? [
            new Ast.Node('paragraph', {}, [
              new Ast.Node('inline', {}, [
                new Ast.Node('strong', {}, [
                  new Ast.Node('text', { content: title })
                ])
              ])
            ]),
            ...children
          ]
        : children
    );
  },
  Example: (tag) =>
    new Ast.Node('fence', {
      content: tag.children.join(''),
      language: tag.attributes.language
    })
} satisfies Record<string, MarkdownRenderHandler>;
