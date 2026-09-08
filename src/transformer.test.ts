import Markdoc, { nodes } from '../index';
import type { Config, RenderableTreeNode } from './types';
import Tag from './tag';

describe('transform', function () {
  describe('synchronous transform', function () {
    it('returns RenderableTreeNode for a single Node', function () {
      const doc = `Hello **world**`;
      const node = Markdoc.parse(doc);
      const result = Markdoc.transform(node);
      expect(result instanceof Promise).toBe(false);
      expect(result instanceof Tag).toBe(true);
    });

    it('returns RenderableTreeNode[] for a Node[]', function () {
      const doc = `Hello`;
      const node = Markdoc.parse(doc);
      const result = Markdoc.transform(node.children);
      expect(result instanceof Promise).toBe(false);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('async transform support', function () {
    it('returns a Promise when a node schema uses an async transform', async function () {
      const doc = `# Heading`;

      const config: Config = {
        nodes: {
          heading: {
            ...nodes.heading,
            async transform(_node, _config) {
              const text = await Promise.resolve('async heading');
              return new Tag('h1', {}, [text]);
            },
          },
        },
      };

      const ast = Markdoc.parse(doc);
      const result = Markdoc.transform(ast, config);
      // With an async transformer, the result should be a Promise
      expect(result instanceof Promise).toBe(true);

      const resolved = await result;
      expect(resolved instanceof Tag).toBe(true);
      // The document root is 'article'; the heading is a child
      const heading = (resolved as Tag).children.find(
        (c) => c instanceof Tag && (c as Tag).name === 'h1'
      );
      expect(heading).toBeDefined();
      expect((heading as Tag).children[0]).toBe('async heading');
    });

    it('returns a Promise for Node[] when any child uses an async transform', async function () {
      const doc = `# Heading\n\nParagraph`;

      const config: Config = {
        nodes: {
          heading: {
            ...nodes.heading,
            async transform(_node, _config) {
              const text = await Promise.resolve('async heading');
              return new Tag('h1', {}, [text]);
            },
          },
        },
      };

      const ast = Markdoc.parse(doc);
      const result = Markdoc.transform(ast.children, config);
      // With an async transformer on at least one child, result should be a Promise
      expect(result instanceof Promise).toBe(true);

      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);

      const headings = (resolved as RenderableTreeNode[]).filter(
        (r) => r instanceof Tag && (r as Tag).name === 'h1'
      );
      expect(headings.length).toBe(1);
    });

    it('resolves async Node[] transforms in document order', async function () {
      const doc = `# First\n\n# Second`;
      const order: string[] = [];

      const config: Config = {
        nodes: {
          heading: {
            ...nodes.heading,
            async transform(node, _config) {
              const text =
                node.children[0]?.children[0]?.attributes?.content ?? '';
              order.push(text);
              return new Tag('h1', {}, [text]);
            },
          },
        },
      };

      const ast = Markdoc.parse(doc);
      const result = await Markdoc.transform(ast.children, config);
      expect(Array.isArray(result)).toBe(true);

      const tags = (result as RenderableTreeNode[]).filter(
        (r) => r instanceof Tag && (r as Tag).name === 'h1'
      );
      expect(tags.length).toBe(2);
      expect((tags[0] as Tag).children[0]).toBe('First');
      expect((tags[1] as Tag).children[0]).toBe('Second');
    });
  });
});
