import Tag from './ast/tag';
import { Class } from './schema-types/class';
import type {
  Config,
  Node,
  NodeType,
  Schema,
  RenderableTreeNode,
  RenderableTreeNodes,
} from './types';

type AttributesSchema = Schema['attributes'];

export const globalAttributes: AttributesSchema = {
  class: { type: Class, render: true },
  id: { type: String, render: true },
};

export interface Transformer {
  findSchema(node: Node, config: Config): Schema | undefined;
  node(node: Node, config: Config): RenderableTreeNodes;
  attributes(node: Node, config: Config): Record<string, any>;
  children(node: Node, config: Config): RenderableTreeNode[];
}

export default {
  findSchema(node: Node, { nodes = {}, tags = {} }: Config = {}) {
    return node.tag ? tags[node.tag] : nodes[node.type as NodeType];
  },

  attributes(node: Node, config: Config = {}) {
    const schema = this.findSchema(node, config) ?? {};
    const output: Record<string, any> = {};

    const attrs = { ...globalAttributes, ...schema.attributes };
    for (const [key, attr] of Object.entries(attrs)) {
      if (attr.render == false) continue;

      const name = typeof attr.render === 'string' ? attr.render : key;

      let value = node.attributes[key];
      if (typeof attr.type === 'function') {
        const instance: any = new attr.type();
        if (instance.transform) {
          value = instance.transform(value, config);
        }
      }
      value = value === undefined ? attr.default : value;

      if (value === undefined) continue;
      output[name] = value;
    }

    return output;
  },

  children(node: Node, config: Config = {}) {
    return node.children.flatMap((child) => this.node(child, config));
  },

  node(node: Node, config: Config = {}) {
    const schema = this.findSchema(node, config) ?? {};
    if (schema && schema.transform instanceof Function)
      return schema.transform(node, config);

    const children = this.children(node, config);
    if (!schema || !schema.render) return children;

    const attributes = this.attributes(node, config);
    return new Tag(schema.render, attributes, children);
  },
} as Transformer;
