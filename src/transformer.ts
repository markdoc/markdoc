import Tag from './tag';
import { Class } from './schema-types/class';
import { isPromise } from './utils';
import type { Config, Node, NodeType, Schema, Transformer } from './types';
import { Value } from '..';

type AttributesSchema = Schema['attributes'];

export const globalAttributes: AttributesSchema = {
  class: { type: Class, render: true },
  id: {
    type: String,
    render: true,
    validate(value: Value, _config: Config) {
      return typeof value === 'string' && value.match(/^[a-zA-Z]/)
        ? []
        : [
            {
              id: 'attribute-value-invalid',
              level: 'error',
              message: "The 'id' attribute must start with a letter",
            },
          ];
    },
  },
};

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
    const children = node.children.flatMap((child) => this.node(child, config));
    if (children.some(isPromise)) {
      return Promise.all(children);
    }
    return children;
  },

  node(node: Node, config: Config = {}) {
    const schema = this.findSchema(node, config) ?? {};
    if (schema && schema.transform instanceof Function)
      return schema.transform(node, config);

    const children = this.children(node, config);
    if (!schema || !schema.render) return children;

    const attributes = this.attributes(node, config);

    if (isPromise(attributes) || isPromise(children)) {
      return Promise.all([attributes, children]).then(
        (values) => new Tag(schema.render, ...values)
      );
    }

    return new Tag(schema.render, attributes, children);
  },
} as Transformer;
