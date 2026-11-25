import Markdoc from '@markdoc/markdoc';

export default {
  Callout: (tag, { renderChildren }) =>
    new Markdoc.Ast.Node('blockquote', {}, renderChildren(tag.children)),
  Heading: (tag, { renderChildren }) =>
    new Markdoc.Ast.Node('heading', { level: 2 }, renderChildren(tag.children)),
};
