/* eslint-disable @typescript-eslint/ban-ts-comment */
import markdoc from '../../index';
import Node from './node';
import Variable from './variable';

import Tag from '../tag';

describe('Node object', function () {
  describe('traversal', function () {
    it('with a simple document', function () {
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

  it('without slots', function () {
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

  it('with slots', function () {
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

describe('transform', function () {
  function transform(content, config = {}) {
    return markdoc.transform(content, config);
  }

  describe('built-in nodes', function () {
    it('a heading node', function () {
      const example = new Node('heading', { level: 1 }, [
        new Node('inline', {}, [
          new Node('text', { content: 'This is a heading' }),
        ]),
      ]);

      const output = transform(example);
      expect(output).toDeepEqual(new Tag('h1', {}, ['This is a heading']));
    });

    describe('fenced code blocks', function () {
      it('fenced code block with language', function () {
        const example = new Node('fence', {
          language: 'ruby',
          content: 'test',
        });
        const output = transform(example);
        expect(output).toDeepEqual(
          new Tag('pre', { 'data-language': 'ruby' }, ['test'])
        );
      });
    });
  });

  describe('transform functions', function () {
    it('with a simple render function', function () {
      const example = new Node('foo', {});

      const foo = {
        transform() {
          return new Tag('foo', {}, []);
        },
      };

      const output = transform(example, { nodes: { foo } });
      expect(output).toDeepEqual(new Tag('foo', {}, []));
    });

    it('with a render function that renders attributes', function () {
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

  describe('tags', function () {
    const tags = {
      foo: {
        render: 'foo',
        attributes: {
          bar: { type: 'String', render: true },
        },
      },
    };

    it('with a tag', function () {
      const example = new Node(
        'tag',
        { bar: 'baz' },
        [new Node('inline', {}, [new Node('text', { content: 'test' })])],
        'foo'
      );

      const output = transform(example, { tags });
      expect(output).toDeepEqual(new Tag('foo', { bar: 'baz' }, ['test']));
    });

    it('with a non-existing tag', function () {
      const example = new Node('container', { bar: 'baz' }, [
        new Node('inline', {}, [new Node('text', { content: 'test' })]),
      ]);

      // @ts-ignore test mutating node in userland
      example.container = 'bar';
      const output = transform(example, { tags });
      expect(output).toDeepEqual(['test']);
    });
  });

  describe('tag name', function () {
    it('with a string value', function () {
      const example = new Node('foo', {});
      const foo = { render: 'foo' };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(output.name).toEqual('foo');
    });

    it('with no value', function () {
      const example = new Node('foo', {}, [new Node('bar', {})]);

      const output = transform(example, {
        nodes: { foo: {}, bar: { render: 'bar' } },
      });
      expect(output).toDeepEqual([new Tag('bar', {}, [])]);
    });
  });

  describe('attributes', function () {
    it('with an id', function () {
      const example = new Node('paragraph', { id: 'bar' });
      const output = transform(example);
      expect(output).toDeepEqualSubset({
        name: 'p',
        attributes: { id: 'bar' },
      });
    });

    it('with a class', function () {
      const example = new Node('paragraph', {
        class: { foo: true, bar: false },
      });
      const output = transform(example);
      expect(output).toDeepEqual(new Tag('p', { class: 'foo' }, []));
    });

    it('with boolean render attribute', function () {
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

    it('with string render attribute', function () {
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
        new Tag('foo', { 'data-bar': 1, 'data-baz': 'test' })
      );
    });

    it('with a non-rendered attribute', function () {
      const example = new Node('foo', { bar: 1, baz: 'test' });
      const foo = {
        render: 'foo',
        attributes: {
          bar: { type: Number, render: true },
        },
      };

      const output = transform(example, { nodes: { foo } }) as Tag;
      expect(Object.keys(output.attributes).includes('baz')).toBeFalse();
      expect(output).toDeepEqual(new Tag('foo', { bar: 1 }, []));
    });

    it('with a default attribute value', function () {
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

    it('with an overriden default attribute value', function () {
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

    it('variable nested in a hash', function () {
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
        `\`\`\`js {% z=true .class y=2 x="1" #id %} \nContent\n\`\`\``
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
