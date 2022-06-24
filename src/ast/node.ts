import { resolve } from './base';
import { transformer, asyncTransformer } from '../transformer';
import type {
  AstType,
  Location,
  Config,
  RenderableTreeNode,
  RenderableTreeNodes,
  Schema,
  ValidationError,
} from '../types';

export default class Node implements AstType {
  readonly $$mdtype = 'Node';

  attributes: Record<string, any>;
  children: Node[];
  errors: ValidationError[] = [];
  lines: number[] = [];
  type: string;
  tag?: string;

  inline = false;
  location?: Location;

  constructor(
    type = 'node',
    attributes: Record<string, any> = {},
    children: Node[] = [],
    tag?: string
  ) {
    this.attributes = attributes;
    this.children = children;
    this.type = type;
    this.tag = tag;
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

  transform(config: Config): RenderableTreeNodes {
    return transformer.node(this, config);
  }

  async transformAttributesAsync(config: Config = {}) {
    return asyncTransformer.attributes(this, config);
  }

  async transformChildrenAsync(config: Config): Promise<RenderableTreeNode[]> {
    return asyncTransformer.children(this, config);
  }

  async transformAsync(config: Config): Promise<RenderableTreeNodes> {
    return asyncTransformer.node(this, config);
  }
}
