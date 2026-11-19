import { describe, expect, it } from 'vitest';
import markdoc from '../../index';
import Tag from '../tag';
import { getAstValues } from './base';
import FunctionNode from './function';
import Node from './node';
import Variable from './variable';

describe('Node object', () => {
  it('resolves into independent children, slots, and nested attributes', () => {
    const node = new Node('tag', {
      nested: { values: [new Variable(['value'])] },
    });
    node.children.push(new Node('text', { content: new Variable(['value']) }));
    node.slots.title = new Node('text', {
      content: new FunctionNode('identity', { 0: new Variable(['value']) }),
    });
    const config = {
      variables: { value: 'resolved' },
      functions: { identity: { transform: (parameters) => parameters[0] } },
    };
    const resolved = node.resolve(config);

    expect(resolved).not.toBe(node);
    expect(Object.getPrototypeOf(resolved)).toBe(Node.prototype);
    expect(Object.keys(resolved)).toEqual(Object.keys(node));
    expect(resolved.attributes.nested).toEqual({ values: ['resolved'] });
    expect(resolved.children[0].attributes.content).toBe('resolved');
    expect(resolved.slots.title.attributes.content).toBe('resolved');
    expect(resolved.children).not.toBe(node.children);
    expect(resolved.children[0]).not.toBe(node.children[0]);
    expect(resolved.slots).not.toBe(node.slots);
    expect(resolved.slots.title).not.toBe(node.slots.title);
    expect(resolved.attributes).not.toBe(node.attributes);
    expect(resolved.attributes.nested).not.toBe(node.attributes.nested);
    expect(resolved.attributes.nested.values).not.toBe(
      node.attributes.nested.values,
    );

    resolved.children[0].attributes.content = 'changed';
    resolved.slots.title.attributes.content = 'changed';
    resolved.attributes.nested.values.push('changed');
    const again = node.resolve(config);
    expect(again.children[0].attributes.content).toBe('resolved');
    expect(again.slots.title.attributes.content).toBe('resolved');
    expect(again.attributes.nested.values).toEqual(['resolved']);
  });

  it('restores missing defaults and preserves metadata while resolving', () => {
    const node = new Node('text', { content: 'example' });
    const initialKeys = Object.keys(node);
    Reflect.deleteProperty(node, 'inline');
    Reflect.deleteProperty(node, 'errors');
    Reflect.deleteProperty(node, 'annotations');
    node.lines = [1, 2];

    const resolved = node.resolve();
    const another = node.resolve();
    expect(Object.keys(resolved)).toEqual(initialKeys);
    expect(resolved.inline).toBe(false);
    expect(resolved.errors).toEqual([]);
    expect(resolved.annotations).toEqual([]);
    expect(resolved.errors).not.toBe(another.errors);
    expect(resolved.annotations).not.toBe(another.annotations);
    expect(resolved.lines).toBe(node.lines);
    expect(resolved.slots).not.toBe(node.slots);
  });

  it('copies only own attributes into a prototype-free dictionary', () => {
    const attributes = Object.assign(Object.create({ inherited: 'value' }), {
      own: 'value',
    });
    const node = new Node('tag', attributes);
    expect(Object.getPrototypeOf(node.attributes)).toBeNull();
    expect(Object.keys(node.attributes)).toEqual(['own']);
    expect(node.attributes.own).toBe('value');
  });

  it('preserves prototype-free attributes and resolves nested values', () => {
    const attributes = Object.fromEntries([
      ['__proto__', { src: new Variable(['url']) }],
      ['src', new Variable(['url'])],
    ]);
    const node = new Node('tag', attributes);
    const resolved = node.resolve({
      variables: { url: 'https://example.com/' },
    });
    expect(Object.getPrototypeOf(resolved.attributes)).toBeNull();
    expect(Object.keys(resolved.attributes)).toEqual(['__proto__', 'src']);
    // biome-ignore lint/suspicious/noProto: Verify the own __proto__ data property preserved by the security fix.
    expect(resolved.attributes.__proto__.src).toBe('https://example.com/');
    expect(resolved.attributes.src).toBe('https://example.com/');
  });

  it('traverses AST values in prototype-free attribute dictionaries', () => {
    const variable = new Variable(['url']);
    const node = new Node('tag', { src: variable });
    expect([...getAstValues(node.attributes)]).toEqual([variable]);
  });

  it('resolves object values without invoking prototype setters', () => {
    const value = Object.fromEntries([
      ['safe', new Variable(['url'])],
      ['__proto__', { src: new Variable(['url']) }],
    ]);
    const node = new Node('tag', { value });
    const resolved = node.resolve({
      variables: { url: 'https://example.com/' },
    });
    expect(Object.getPrototypeOf(resolved.attributes.value)).toBe(
      Object.prototype,
    );
    expect(Object.keys(resolved.attributes.value)).toEqual([
      'safe',
      '__proto__',
    ]);
    expect(resolved.attributes.value.src).toBeUndefined();
    // biome-ignore lint/suspicious/noProto: Verify the own __proto__ data property preserved by the security fix.
    expect(resolved.attributes.value.__proto__.src).toBe(
      'https://example.com/',
    );
  });

  it('resolves serialized function and variable attributes', () => {
    const serialized = JSON.parse(
      JSON.stringify({
        direct: new Variable(['answer']),
        computed: new FunctionNode('identity', {
          0: new Variable(['answer']),
        }),
      }),
    );
    const node = new Node('tag', serialized);
    const resolved = node.resolve({
      variables: { answer: 'resolved' },
      functions: {
        identity: { transform: (parameters) => parameters[0] },
      },
    });

    expect(resolved.attributes.direct).toBe('resolved');
    expect(resolved.attributes.computed).toBe('resolved');
  });

  describe('traversal', () => {
    it('with a simple document', () => {
      const example = new Node('document', {}, [
        new Node('heading', { level: 1 }, [
          new Node('inline', {}, [
            new Node('text', { content: 'This is a heading' }),
          ]),
        ]),
        new Node('paragraph', {}, [
          new Node('inline', {}, [
            new Node('text', { content: 'This is a paragraph' }),
          ]),
        ]),
      ]);

      const iter = example.walk();
      expect(typeof iter[Symbol.iterator]).toEqual('function');

      const output = [...iter];
      expect(output.length).toEqual(6);
    });
  });

  it('without slots', () => {
    const example = `
{% example %}
# bar

baz
{% /example %}
    `;

    const ast = markdoc.parse(example, { slots: true });
    const iter = Array.from(ast.walk());
    expect(iter.map((n) => n.tag ?? n.type)).toEqual([
      'example',
      'heading',
      'inline',
      'text',
      'paragraph',
      'inline',
      'text',
    ]);
  });

  it('with slots', () => {
    const example = `
{% example %}
# bar

{% slot "foo" %}
baz
{% /slot %}
{% /example %}
    `;

    const ast = markdoc.parse(example, { slots: true });
    const iter = Array.from(ast.walk());
    expect(iter.map((n) => n.tag ?? n.type)).toEqual([
      'example',
      'slot',
      'paragraph',
      'inline',
      'text',
      'heading',
      'inline',
      'text',
    ]);
  });
});

describe('transform', () => {
  function transform(content, config = {}) {
    return markdoc.transform(content, config);
  }

  describe('built-in nodes', () => {
    it('a heading node', () => {
      const example = new Node('heading', { level: 1 }, [
        new Node('inline', {}, [
          new Node('text', { content: 'This is a heading' }),
        ]),
      ]);

      const output = transform(example);
      expect(output).toDeepEqual(new Tag('h1', {}, ['This is a heading']));
    });

    it('a heading node with an invalid level', () => {
      const levels = ['1>x', '2', 0, 7, 1.5];
      for (const level of levels) {
        const example = new Node('heading', { level }, [
          new Node('inline', {}, [
            new Node('text', { content: 'This is a heading' }),
          ]),
        ]);

        expect(transform(example)).toDeepEqual(['This is a heading']);
      }
    });

    describe('fenced code blocks', () => {
      it('fenced code block with language', () => {
        const example = new Node('fence', {
          language: 'ruby',
          content: 'test',
        });
        const output = transform(example);
        expect(output).toDeepEqual(
          new Tag('pre', { 'data-language': 'ruby' }, ['test']),
        );
      });
    });
  });

  describe('transform functions', () => {
    it('with a simple render function', () => {
      const example = new Node('foo', {});

      const foo = {
        transform() {
          return new Tag('foo', {}, []);
        },
      };

      const output = transform(example, { nodes: { foo } });
      expect(output).toDeepEqual(new Tag('foo', {}, []));
    });

    it('with a render function that renders attributes', () => {
      const example = new Node('foo', { bar: 'baz', test: 100 });
      const foo = {
        attributes: {
          bar: { type: String, render: true },
          test: { type: Number, render: 'example' },
        },
        transform(node, config) {
          return {
            name: 'foo',
            attributes: node.transformAttributes(config),
          };
        },
      };

      const output = transform(example, { nodes: { foo } });
      expect(output).toDeepEqual({
        name: 'foo',
        attributes: { bar: 'baz', example: 100 },
      });
    });
  });

  describe('tags', () => {
    const tags = {
      foo: {
        render: 'foo',
        attributes: {
          bar: { type: 'String', render: true },
        },
      },
    };

    it('with a tag', () => {
      const example = new Node(
        'tag',
        { bar: 'baz' },
        [new Node('inline', {}, [new Node('text', { content: 'test' })])],
        'foo',
      );

      const output = transform(example, { tags });
      expect(output).toDeepEqual(new Tag('foo', { bar: 'baz' }, ['test']));
    });

    it('with a non-existing tag', () => {
      const example = new Node('container', { bar: 'baz' }, [
        new Node('inline', {}, [new Node('text', { content: 'test' })]),
      ]);

      // @ts-expect-error test mutating node in userland
      example.container = 'bar';
      const output = transform(example, { tags });
      expect(output).toDeepEqual(['test']);
    });
  });

  describe('tag name', () => {
    it('with a string value', () => {
      const example = new Node('foo', {});
      const foo = { render: 'foo' };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(output.name).toEqual('foo');
    });

    it('with no value', () => {
      const example = new Node('foo', {}, [new Node('bar', {})]);

      const output = transform(example, {
        nodes: { foo: {}, bar: { render: 'bar' } },
      });
      expect(output).toDeepEqual([new Tag('bar', {}, [])]);
    });
  });

  describe('attributes', () => {
    it('with an id', () => {
      const example = new Node('paragraph', { id: 'bar' });
      const output = transform(example);
      expect(output).toDeepEqualSubset({
        name: 'p',
        attributes: { id: 'bar' },
      });
    });

    it('with a class', () => {
      const example = new Node('paragraph', {
        class: { foo: true, bar: false },
      });
      const output = transform(example);
      expect(output).toDeepEqual(new Tag('p', { class: 'foo' }, []));
    });

    it('with boolean render attribute', () => {
      const example = new Node('foo', { bar: 1, baz: 'test' });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: true },
          baz: { type: String, render: true },
        },
      };

      const output = transform(example, { nodes: { foo } });
      expect(output).toDeepEqual(new Tag('foo', { bar: 1, baz: 'test' }));
    });

    it('with string render attribute', () => {
      const example = new Node('foo', { bar: 1, baz: 'test' });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: 'data-bar' },
          baz: { type: String, render: 'data-baz' },
        },
      };

      const output = transform(example, { nodes: { foo } });
      expect(output).toDeepEqual(
        new Tag('foo', { 'data-bar': 1, 'data-baz': 'test' }),
      );
    });

    it('with a non-rendered attribute', () => {
      const example = new Node('foo', { bar: 1, baz: 'test' });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: true },
        },
      };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(Object.keys(output.attributes).includes('baz')).toBe(false);
      expect(output).toDeepEqual(new Tag('foo', { bar: 1 }, []));
    });

    it('with a default attribute value', () => {
      const example = new Node('foo', {});
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: true, default: 10 },
        },
      };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(output.attributes.bar).toEqual(10);
    });

    it('with an overriden default attribute value', () => {
      const example = new Node('foo', { bar: 1 });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: true, default: 10 },
        },
      };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(output.attributes.bar).toEqual(1);
    });

    it('variable nested in a hash', () => {
      const bar = new Variable(['a', 'b', 'c']);
      const example = new Node('foo', { bar });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: String, render: true },
        },
      };

      const output = transform(example, {
        nodes: { foo },
        variables: { a: { b: { c: 'example' } } },
      });
      expect(output).toDeepEqual(new Tag('foo', { bar: 'example' }, []));
    });

    describe('custom types', () => {
      const cases = [
        {
          name: 'should support default values',
          type: class NonNullString {
            transform(value) {
              return value || '';
            }
          },
          attributes: undefined,
          expectedValue: '',
        },
        {
          name: 'should support transforms',
          type: class UpperCaseString {
            transform(value) {
              return (value || '').toUpperCase();
            }
          },
          value: 'test',
          expectedValue: 'TEST',
        },
      ];

      cases.forEach((test) => {
        it(test.name, () => {
          const example = new Node('tag', { bar: test.value });

          const config = {
            nodes: {
              tag: {
                render: 'tag',
                attributes: {
                  bar: {
                    render: true,
                    type: test.type,
                  },
                },
              },
            },
          };

          const output = transform(example, config) as Tag;
          expect(output.attributes.bar).toEqual(test.expectedValue);
        });
      });
    });
  });

  describe('annotations', () => {
    it('multiple values should be ordered correctly', () => {
      const example = markdoc.parse(
        `\`\`\`js {% z=true .class y=2 x="1" #id %} \nContent\n\`\`\``,
      );

      const fence = example.children[0];

      const { attributes, annotations } = fence;

      expect(attributes).toEqual({
        content: 'Content\n',
        language: 'js',
        id: 'id',
        class: { class: true },
        z: true,
        y: 2,
        x: '1',
      });
      expect(annotations).toDeepEqual([
        { type: 'attribute', name: 'z', value: true },
        { type: 'class', name: 'class', value: true },
        { type: 'attribute', name: 'y', value: 2 },
        { type: 'attribute', name: 'x', value: '1' },
        { type: 'attribute', name: 'id', value: 'id' },
      ]);
    });
  });

  describe('async support', () => {
    it('should allow for injecting an async transformer', async () => {
      const doc = `![img](/src)`;

      const config = {
        nodes: {
          image: {
            async transform() {
              const value = await new Promise((res) => res('1'));
              return value;
            },
          },
        },
      };

      // @ts-expect-error
      const content = await markdoc.transform(markdoc.parse(doc), config);

      // @ts-expect-error
      expect(content.children[0].children[0]).toEqual(['1']);
    });
  });
});
