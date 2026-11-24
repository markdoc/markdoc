import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { nodes, Tag } from '@markdoc/markdoc';
import { Code } from '../../components/Code';

export default {
  render: Code,
  attributes: nodes.fence.attributes,
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    // Fences with `process=false` have no children, only their content
    const children = node.children.length
      ? node.transformChildren(config)
      : [node.attributes.content];

    return new Tag(this.render as string, attributes, children);
  }
} satisfies MarkdocNextJsSchema;
