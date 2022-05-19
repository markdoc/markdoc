// @ts-check

import Tokenizer from '../src/tokenizer';
import parser from '../src/parser';
import Variable from '../src/ast/variable';
import { any } from 'deep-assert';

describe('Markdown parser', function () {
  const fence = '```';
  const tokenizer = new Tokenizer();

  function convert(example) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    const tokens = tokenizer.tokenize(content);
    return parser(tokens);
  }

  describe('handling frontmatter', function () {
    it('simple frontmatter', function () {
      const example = convert(`
      ---
      foo: bar
      ---
      `);

      expect(example).toDeepEqual({
        ...any(),
        type: 'document',
        attributes: {
          frontmatter: 'foo: bar',
        },
        children: [],
      });
    });

    it('frontmatter followed by content', function () {
      const example = convert(`
      ---
      foo: bar
      test: true
      ---

      # This is a test
      `);

      expect(example).toDeepEqual({
        ...any(),
        type: 'document',
        attributes: {
          frontmatter: 'foo: bar\ntest: true',
        },
        children: [{ type: 'heading', attributes: { level: 1 }, ...any() }],
      });
    });
  });

  describe('handling attributes', function () {
    it('for heading', function () {
      const document = convert(`# Sample Heading`);
      expect(document.children[0].attributes).toDeepEqual({ level: 1 });
    });

    it('for list', function () {
      const unordered = convert(`
      * Example 1
      * Example 2
      * Example 3
      `);

      const ordered = convert(`
      1. Example 1
      2. Example 2
      3. Example 3
      `);

      expect(unordered.children[0].attributes.ordered).toEqual(false);
      expect(ordered.children[0].attributes.ordered).toEqual(true);
    });

    it('for link with one word', function () {
      const document = convert(`
      [foo](/bar)
      `);

      const link = document.children[0].children[0].children[0];
      expect(link.attributes).toDeepEqual({ href: '/bar' });
    });

    it('for link with one word and a title', function () {
      const document = convert(`
      [foo](/bar "title")
      `);

      const link = document.children[0].children[0].children[0];
      expect(link.attributes).toDeepEqual({ href: '/bar', title: 'title' });
    });

    it('for link', function () {
      const document = convert(`
      [this is a test](/bar)
      `);

      const link = document.children[0].children[0].children[0];
      expect(link.attributes).toDeepEqual({ href: '/bar' });
    });

    it('for text', function () {
      const document = convert(`
      This is a test
      `);

      const p = document.children[0].children[0].children[0];
      expect(p.attributes).toDeepEqual({ content: 'This is a test' });
    });

    it('for code fence', function () {
      const simple = convert(`
      ${fence}ruby
      This is a test
      ${fence}
      `);

      const complex = convert(`
      ${fence}ruby this is a test
      This is a test
      ${fence}
      `);

      const empty = convert(`
      ${fence}
      This is a test
      ${fence}
      `);

      expect(simple.children[0].attributes).toDeepEqual({
        language: 'ruby',
        content: 'This is a test\n',
      });

      expect(complex.children[0].attributes).toDeepEqual({
        language: 'ruby',
        content: 'This is a test\n',
      });

      expect(empty.children[0].attributes).toDeepEqual({
        content: 'This is a test\n',
      });
    });
  });

  it('handling a header', function () {
    const example = convert(`
    # Sample Heading
    
    This is a sample paragraph
    `);

    expect(example).toDeepEqualSubset({
      type: 'document',
      children: [
        {
          type: 'heading',
          attributes: { level: 1 },
          children: [
            {
              type: 'inline',
              children: [
                { type: 'text', attributes: { content: 'Sample Heading' } },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'inline',
              children: [
                {
                  type: 'text',
                  attributes: { content: 'This is a sample paragraph' },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('handling an image', function () {
    const example = convert('![Alt](/logo.png)');
    expect(example).toDeepEqualSubset({
      type: 'document',
      children: [
        {
          type: 'paragraph',
          attributes: {},
          children: [
            {
              type: 'inline',
              children: [
                {
                  type: 'image',
                  attributes: { alt: 'Alt', src: '/logo.png' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('handling lists', function () {
    it('with bullets', function () {
      const example = convert(`
      * foo
      * bar
      `);

      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'list',
            attributes: { ordered: false },
            children: [
              {
                type: 'item',
                children: [
                  {
                    type: 'inline',
                    children: [
                      { type: 'text', attributes: { content: 'foo' } },
                    ],
                  },
                ],
              },
              {
                type: 'item',
                children: [
                  {
                    type: 'inline',
                    children: [
                      { type: 'text', attributes: { content: 'bar' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('with numbers', function () {
      const example = convert(`
      1. foo
      2. bar
      `);

      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'list',
            attributes: { ordered: true },
            children: [
              {
                type: 'item',
                children: [
                  {
                    type: 'inline',
                    children: [
                      { type: 'text', attributes: { content: 'foo' } },
                    ],
                  },
                ],
              },
              {
                type: 'item',
                children: [
                  {
                    type: 'inline',
                    children: [
                      { type: 'text', attributes: { content: 'bar' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe('handling fenced code', function () {
    it('with a language', function () {
      const example = convert(`
      ${fence}ruby
      puts "foo"
      ${fence}
      `);

      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'fence',
            attributes: { language: 'ruby', content: 'puts "foo"\n' },
          },
        ],
      });
    });

    it('with an annotation', function () {
      const example = convert(`
      ${fence}ruby {% #foo .bar %}
      test
      ${fence}
      `);

      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'fence',
            attributes: {
              id: 'foo',
              class: { bar: true },
              language: 'ruby',
              content: 'test\n',
            },
          },
        ],
      });
    });
  });

  describe('handling tags', function () {
    describe('at block level', function () {
      it('with a class', function () {
        const example = convert(`
        {% callout .foo .bar %}
        ### Heading

        This is a paragraph
        {% /callout %}
        `);

        expect(example).toDeepEqualSubset({
          type: 'document',
          children: [
            {
              type: 'tag',
              tag: 'callout',
              attributes: { class: { foo: true, bar: true } },
              children: [
                {
                  type: 'heading',
                  attributes: { level: 3 },
                  children: [
                    {
                      type: 'inline',
                      children: [
                        { type: 'text', attributes: { content: 'Heading' } },
                      ],
                    },
                  ],
                },
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'inline',
                      children: [
                        {
                          type: 'text',
                          attributes: { content: 'This is a paragraph' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('with nesting', function () {
        const example = convert(`
        {% callout %}
        {% callout %}
        This is a test
        {% /callout %}
        {% /callout %}
        `);

        expect(example).toDeepEqualSubset({
          type: 'document',
          children: [
            {
              type: 'tag',
              tag: 'callout',
              children: [
                {
                  type: 'tag',
                  tag: 'callout',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'inline',
                          children: [
                            {
                              type: 'text',
                              attributes: { content: 'This is a test' },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      });
    });
  });

  describe('handling annotations', function () {
    describe('in a header', function () {
      it('with an id', function () {
        const example = convert(`# Sample Heading {% #foo-bar %}`);
        expect(example).toDeepEqualSubset({
          type: 'document',
          children: [
            {
              type: 'heading',
              attributes: { id: 'foo-bar', level: 1 },
              children: [
                {
                  type: 'inline',
                  children: [
                    {
                      type: 'text',
                      attributes: { content: 'Sample Heading ' },
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('with a class', function () {
        const example = convert(`# Sample Heading {% .foo-bar .test %}`);
        expect(example).toDeepEqualSubset({
          type: 'document',
          children: [
            {
              type: 'heading',
              attributes: { class: { 'foo-bar': true, test: true }, level: 1 },
              children: [
                {
                  type: 'inline',
                  children: [
                    {
                      type: 'text',
                      attributes: { content: 'Sample Heading ' },
                    },
                  ],
                },
              ],
            },
          ],
        });
      });

      it('with complex values', function () {
        const example = convert(
          `# Sample Heading {% #asdf .foo-bar .test foo="bar" %}`
        );
        expect(example).toDeepEqualSubset({
          type: 'document',
          children: [
            {
              type: 'heading',
              attributes: {
                class: { 'foo-bar': true, test: true },
                id: 'asdf',
                level: 1,
                foo: 'bar',
              },
              children: [
                {
                  type: 'inline',
                  children: [
                    {
                      type: 'text',
                      attributes: { content: 'Sample Heading ' },
                    },
                  ],
                },
              ],
            },
          ],
        });
      });
    });
  });

  describe('handling variables', function () {
    it('by itself on a line', function () {
      const example = convert(`{% $test %}`);
      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'inline',
                children: [
                  {
                    type: 'text',
                    attributes: { content: new Variable(['test'], null) },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('in an inline text node', function () {
      const example = convert(`This is a test: {% $test %}`);
      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'inline',
                children: [
                  { type: 'text', attributes: { content: 'This is a test: ' } },
                  {
                    type: 'text',
                    attributes: { content: new Variable(['test'], null) },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('with nested property access', function () {
      const example = convert('{% $bar.baz[1].test %}');
      expect(example).toDeepEqualSubset({
        type: 'document',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'inline',
                children: [
                  {
                    type: 'text',
                    attributes: {
                      content: new Variable(['bar', 'baz', 1, 'test'], null),
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  it('parsing nested tags with indentation should not throw', function () {
    expect(() => {
      convert(`
{% tag1 %}
      {% tag2 %}
          Contents
      {% /tag2 %}
{% /tag1 %}
    `);
    }).not.toThrow();
  });
});
