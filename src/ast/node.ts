import { resolve } from './base';
import transformer from '../transformer';
import type {
  AstType,
  AttributeValue,
  Config,
  Location,
  NodeType,
  RenderableTreeNode,
  RenderableTreeNodesPromise,
  Schema,
  ValidationError,
} from '../types';

export default class Node implements AstType {
  readonly $$mdtype = 'Node';

  attributes: Record<string, any>;
  children: Node[];
  errors: ValidationError[] = [];
  lines: number[] = [];
  type: NodeType;
  tag?: string;
  annotations: AttributeValue[];

  inline = false;
  location?: Location;

  constructor(
    type: NodeType = 'node',
    attributes: Record<string, any> = {},
    children: Node[] = [],
    tag?: string
  ) {
    this.attributes = attributes;
    this.children = children;
    this.type = type;
    this.tag = tag;
    this.annotations = [];
  }

  *walk(): Generator<Node, void, unknown> {
    for (const child of this.children) {
      yield child;
      yield* child.walk();
    }
  }

  push(node: Node) {
    this.children.push(node);
  }

  resolve(config: Config = {}): Node {
    return Object.assign(new Node(), this, {
      children: this.children.map((child) => child.resolve(config)),
      attributes: resolve(this.attributes, config),
    });
  }

  findSchema(config: Config = {}): Schema | undefined {
    return transformer.findSchema(this, config);
  }

  transformAttributes(config: Config = {}) {
    return transformer.attributes(this, config);
  }

  transformChildren(config: Config): RenderableTreeNode[] {
    return transformer.children(this, config);
  }

  transform(config: Config): RenderableTreeNodesPromise {
    return transformer.node(this, config);
  }
}
