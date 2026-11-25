import type { MarkdownRenderHandler } from '@markdoc/markdoc';
import { Ast } from '@markdoc/markdoc';

// Markdown handlers for components, keyed like the components the plugin renders
export default {
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
