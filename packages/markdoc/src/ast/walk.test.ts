import { describe, expect, it } from 'vitest';
import Markdoc from '../../index';
import { walkWithParents } from '../validator';
import Node from './node';

function expectNodes(actual: Node[], expected: Node[]) {
  expect(actual).toHaveLength(expected.length);
  for (const [index, node] of expected.entries())
    expect(actual[index]).toBe(node);
}

function expectVisit(
  actual: [Node, Node[]] | undefined,
  expected: [Node, Node[]],
) {
  expect(actual).toBeDefined();
  expect(actual![0]).toBe(expected[0]);
  expectNodes(actual![1], expected[1]);
}

function expectVisits(actual: [Node, Node[]][], expected: [Node, Node[]][]) {
  expect(actual).toHaveLength(expected.length);
  for (const [index, entry] of expected.entries())
    expectVisit(actual[index], entry);
}

describe('Node.walk', () => {
  it('visits slots before children in preorder, including repeated nodes', () => {
    const shared = new Node();
    const slot = new Node('slot', {}, [shared]);
    const child = new Node('paragraph', {}, [shared]);
    const childSlot = new Node('slot');
    child.slots.title = childSlot;
    const root = new Node('document', {}, [child]);
    root.slots.title = slot;

    expectNodes([...root.walk()], [slot, shared, child, childSlot, shared]);
  });

  it('snapshots siblings but reads descendants after yielding their parent', () => {
    const first = new Node();
    const second = new Node();
    const root = new Node('document', {}, [first, second]);
    const iter = root.walk();
    const beforeStart = new Node();
    root.children.push(beforeStart);
    expect(iter.next().value).toBe(first);

    root.children = [];
    const descendant = new Node();
    first.slots.title = descendant;
    expect(iter.next().value).toBe(descendant);

    first.children.push(new Node());
    const laterDescendant = new Node();
    second.children.push(laterDescendant);
    expectNodes([...iter], [second, laterDescendant, beforeStart]);
  });

  it('delegates to custom child walkers with the child as receiver', () => {
    const replacement = new Node();
    class CustomNode extends Node {
      *walk() {
        expect(this).toBe(custom);
        yield replacement;
      }
    }
    const custom = new CustomNode('node', {}, [new Node()]);
    Object.defineProperty(custom.walk, 'call', { value: undefined });
    const sibling = new Node();
    const root = new Node('document', {}, [custom, sibling]);

    expectNodes([...root.walk()], [custom, replacement, sibling]);
  });

  it('reads a child walker after yielding the child', () => {
    const child = new Node();
    const replacement = new Node();
    const iter = new Node('document', {}, [child]).walk();
    expect(iter.next().value).toBe(child);
    child.walk = function* () {
      yield replacement;
    };

    expectNodes([...iter], [replacement]);
  });

  it('honors prototype walker replacements during iteration', () => {
    const child = new Node();
    const replacement = new Node();
    const iter = new Node('document', {}, [child]).walk();
    expect(iter.next().value).toBe(child);
    const original = Node.prototype.walk;
    try {
      Node.prototype.walk = function* () {
        yield replacement;
      };
      expectNodes([...iter], [replacement]);
    } finally {
      Node.prototype.walk = original;
    }
  });

  it('closes a delegated child walker when iteration stops', () => {
    let closed = false;
    const child = new Node();
    child.walk = function* () {
      try {
        yield new Node();
      } finally {
        closed = true;
      }
    };
    const iter = new Node('document', {}, [child]).walk();
    iter.next();
    iter.next();
    iter.return();

    expect(closed).toBe(true);
  });

  it('walks deeply nested trees without recursive generator calls', () => {
    let root = new Node();
    for (let index = 0; index < 4000; index++)
      root = new Node('node', {}, [root]);

    let count = 0;
    for (const _node of root.walk()) count++;
    expect(count).toBe(4000);
  });
});

describe('walkWithParents', () => {
  it('includes the root and visits slots before children with fresh parent arrays', () => {
    const leaf = new Node();
    const slot = new Node('slot', {}, [leaf]);
    const child = new Node();
    const root = new Node('document', {}, [child]);
    root.slots.title = slot;
    const entries = [...walkWithParents(root)];

    expectVisits(entries, [
      [root, []],
      [slot, [root]],
      [leaf, [root, slot]],
      [child, [root]],
    ]);
    expect(new Set(entries.map(([, parents]) => parents)).size).toBe(4);
  });

  it('reads descendants after yielding and snapshots each sibling list', () => {
    const first = new Node();
    const second = new Node();
    const root = new Node('document', {}, [first]);
    const iter = walkWithParents(root);
    expectVisit(iter.next().value, [root, []]);
    root.children.push(second);
    expectVisit(iter.next().value, [first, [root]]);

    root.children = [];
    const descendant = new Node();
    first.slots.title = descendant;
    expectVisit(iter.next().value, [descendant, [root, first]]);
    first.children.push(new Node());
    expectVisits([...iter], [[second, [root]]]);
  });

  it('copies the current parent array separately when each child is reached', () => {
    const grandchild = new Node();
    const first = new Node('node', {}, [grandchild]);
    const second = new Node();
    const root = new Node('document', {}, [first, second]);
    const ancestor = new Node();
    const parents = [ancestor];
    const iter = walkWithParents(root, parents);
    const rootEntry = iter.next().value as [Node, Node[]];
    expectVisit(rootEntry, [root, parents]);
    expect(rootEntry[1]).toBe(parents);
    const before = new Node();
    parents.push(before);
    const firstEntry = iter.next().value as [Node, Node[]];
    expectVisit(firstEntry, [first, [ancestor, before, root]]);

    const local = new Node();
    firstEntry[1].push(local);
    const later = new Node();
    parents.push(later);
    expectVisit(iter.next().value, [
      grandchild,
      [ancestor, before, root, local, first],
    ]);
    const secondEntry = iter.next().value as [Node, Node[]];
    expectVisit(secondEntry, [second, [ancestor, before, later, root]]);
    expect(secondEntry[1]).not.toBe(firstEntry[1]);
  });

  it('does not use replacements made to the yielded tuple', () => {
    const child = new Node();
    const root = new Node('document', {}, [child]);
    const iter = walkWithParents(root);
    const entry = iter.next().value as [Node, Node[]];
    entry[0] = new Node();
    entry[1] = [new Node()];

    expectVisits([...iter], [[child, [root]]]);
  });

  it('walks deeply nested trees without recursive generator calls', () => {
    let root = new Node();
    for (let index = 0; index < 4000; index++)
      root = new Node('node', {}, [root]);

    let count = 0;
    let depth = 0;
    for (const [, parents] of walkWithParents(root)) {
      count++;
      depth = parents.length;
    }
    expect(count).toBe(4001);
    expect(depth).toBe(4000);
  });
});

describe('validation traversal', () => {
  it('snapshots the tree and gives each validation hook its own parent array', () => {
    const first = new Node();
    const second = new Node();
    const root = new Node('node', {}, [first, second]);
    const seen: [Node, Node[]][] = [];
    const parentArrays: Node[][] = [];
    const poison = new Node();

    expect(
      Markdoc.validate(root, {
        nodes: {
          node: {
            validate(node, config) {
              const parents = config.validation!.parents!;
              seen.push([node, [...parents]]);
              parentArrays.push(parents);
              parents.push(poison);
              if (node === root) root.children = [new Node()];
              return [];
            },
          },
        },
      }),
    ).toEqual([]);

    expectVisits(seen, [
      [root, []],
      [first, [root]],
      [second, [root]],
    ]);
    expect(new Set(parentArrays).size).toBe(3);
  });

  it('keeps parent arrays stable for asynchronous validation hooks', async () => {
    const first = new Node();
    const second = new Node();
    const root = new Node('node', {}, [first, second]);
    const seen: [Node, Node[]][] = [];

    await Markdoc.validate(root, {
      nodes: {
        node: {
          async validate(node, config) {
            await Promise.resolve();
            seen.push([node, [...config.validation!.parents!]]);
            config.validation!.parents!.push(new Node());
            return [];
          },
        },
      },
    });

    expectVisits(seen, [
      [root, []],
      [first, [root]],
      [second, [root]],
    ]);
  });
});
