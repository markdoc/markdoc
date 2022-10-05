import { isPromise } from '../utils';

import type { Node, RenderableTreeNode, Schema, Value } from '../types';

type Condition = { condition: Value; children: Node[] };

export function truthy(value: any) {
  return value !== false && value !== undefined && value !== null;
}

function renderConditions(node: Node) {
  const conditions: Condition[] = [
    { condition: node.attributes.primary, children: [] },
  ];
  for (const child of node.children) {
    if (child.type === 'tag' && child.tag === 'else')
      conditions.push({
        condition:
          'primary' in child.attributes ? child.attributes.primary : true,
        children: [],
      });
    else conditions[conditions.length - 1].children.push(child);
  }

  return conditions;
}

export const tagIf: Schema = {
  attributes: {
    primary: { type: Object, render: false },
  },

  transform(node, config) {
    const conditions = renderConditions(node);
    for (const { condition, children } of conditions)
      if (truthy(condition)) {
        const nodes = children.flatMap((child) => child.transform(config));
        if (nodes.some(isPromise)) {
          return Promise.all(nodes).then((nodes) => nodes.flat());
        }
        return nodes as RenderableTreeNode[];
      }
    return [];
  },
};

export const tagElse: Schema = {
  selfClosing: true,
  attributes: {
    primary: { type: Object, render: false },
  },
};
