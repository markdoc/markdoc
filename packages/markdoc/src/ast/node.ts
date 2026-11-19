import transformer from '../transformer';
import type {
  AstType,
  AttributeValue,
  Config,
  Location,
  MaybePromise,
  NodeType,
  RenderableTreeNode,
  RenderableTreeNodes,
  Schema,
  ValidationError,
} from '../types';
import { resolve } from './base';

export default class Node implements AstType {
  readonly $$mdtype = 'Node';

  attributes: Record<string, any>;
  slots: Record<string, Node>;
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
    tag?: string,
  ) {
    this.attributes = Object.assign(Object.create(null), attributes);
    this.children = children;
    this.type = type;
    this.tag = tag;
    this.annotations = [];
    this.slots = {};
  }

  *walk(): Generator<Node, void, unknown> {
    const stack = [...Object.values(this.slots), ...this.children].reverse();
    while (stack.length) {
      const child = stack.pop()!;
      yield child;

      const walk = child.walk;
      if (walk !== defaultWalk) {
        yield* Reflect.apply(walk, child, []);
        continue;
      }

      // Snapshot descendants after yielding their parent, as recursive walk did.
      const children = [...Object.values(child.slots), ...child.children];
      for (let index = children.length - 1; index >= 0; index--)
        stack.push(children[index]);
    }
  }

  push(node: Node) {
    this.children.push(node);
  }

  resolve(config: Config = {}): Node {
    const node = new Node();
    const children = this.children.map((child) => child.resolve(config));
    const attributes = resolve(this.attributes, config);
    const slots = Object.entries(this.slots);

    return Object.assign(node, this, {
      children,
      attributes,
      slots: slots.length
        ? Object.fromEntries(
            slots.map(([name, slot]) => [name, slot.resolve(config)]),
          )
        : {},
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

  transform(config: Config): MaybePromise<RenderableTreeNodes> {
    return transformer.node(this, config);
  }
}

// Keep the original method so replacements on the prototype are also delegated.
const defaultWalk = Node.prototype.walk;
