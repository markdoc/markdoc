import markdoc, { type RenderableTreeNode, type Schema } from '@markdoc/markdoc';
const { nodes } = markdoc;

function generateID(
  children: RenderableTreeNode[],
  attributes: Record<string, unknown>
) {
  if (attributes.id && typeof attributes.id === 'string') {
    return attributes.id;
  }
  return children
    .filter((child) => typeof child === 'string')
    .join(' ')
    .replace(/[?]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export default {
  ...nodes.heading,
  transform(node, config) {
    const base = nodes.heading.transform!(node, config);
    if (!markdoc.Tag.isTag(base)) return base;
    base.attributes.id = generateID(base.children, base.attributes);
    return base;
  }
} satisfies Schema;
