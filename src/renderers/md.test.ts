import MarkdownIt from 'markdown-it';
import Markdoc from '../../index';
import render from './md';
import Ast from '../ast';
import Tag from '../tag';
import type {
  Config,
  MarkdownRenderOptions,
  RenderableTreeNode,
  RenderableTreeNodes,
} from '../types';

const markdownIt = MarkdownIt();

function tag(
  name: string,
  attributes: Record<string, any> = {},
  children: RenderableTreeNode[] = []
) {
  return new Tag(name, attributes, children);
}

function transform(source: string, config?: Config) {
  return Markdoc.transform(Markdoc.parse(source), config);
}

function markdown(source: string, config?: Config) {
  return render(transform(source, config));
}

// Re-parses rendered Markdown to compare meaning rather than exact syntax
function html(content: RenderableTreeNodes, options?: MarkdownRenderOptions) {
  return Markdoc.renderers.html(transform(render(content, options)));
}

describe('Markdown renderer', function () {
  it('is exposed as a renderer', function () {
    expect(Markdoc.renderers.md).toBe(render);
  });

  describe('input', function () {
    it('renders empty content', function () {
      expect(render([])).toEqual('');
      expect(render(null)).toEqual('');
      expect(render(tag('article'))).toEqual('');
    });

    it('renders strings as literal text, not Markdoc source', function () {
      expect(render('# Not a heading')).toEqual('\\# Not a heading\n');
      expect(render(42)).toEqual('42\n');
    });

    it('renders mixed scalar and array content', function () {
      const content = [
        'a',
        1,
        [true, null, { foo: 'bar' }, tag('em', {}, ['b'])],
      ];
      expect(render(content as RenderableTreeNodes)).toEqual('a1*b*\n');
    });

    it('renders serialized tags', function () {
      const content = JSON.parse(JSON.stringify(transform('# Hi **there**')));
      expect(content instanceof Tag).toBeFalse();
      expect(render(content)).toEqual('# Hi **there**\n');
    });

    it('does not mutate the input tree', function () {
      const content = transform('- a\n- b\n\n| x |\n| - |\n| y |\n');
      const copy = JSON.stringify(content);
      render(content, { handlers: { li: 'children' } });
      expect(JSON.stringify(content)).toEqual(copy);
    });
  });

  describe('standard elements', function () {
    it('renders a document', function () {
      const source = `# Heading

Paragraph with *em*, **strong**, ~~strike~~, \`code\`, and [a link](/docs/page#section "Title").

![Alt text](/image.png "Image title")

> Quote

---

Line\\
break
`;
      expect(markdown(source)).toEqual(source);
    });

    it('renders all heading levels', function () {
      const source = [1, 2, 3, 4, 5, 6]
        .map((level) => '#'.repeat(level) + ' Level ' + level)
        .join('\n\n');
      expect(markdown(source)).toEqual(source + '\n');
    });

    it('resolves variables and conditionals during transform', function () {
      const source = `Hello {% $name %}!

{% if $beta %}
Beta content
{% else /%}
Stable content
{% /if %}
`;
      const config = { variables: { name: 'Ada', beta: false } };
      expect(markdown(source, config)).toEqual(
        'Hello Ada!\n\nStable content\n'
      );
    });

    it('keeps relative links and fragments as supplied', function () {
      expect(markdown('[a](../b.md?x=1#y) [c](#d)')).toEqual(
        '[a](../b.md?x=1#y) [c](#d)\n'
      );
    });

    it('renders autolinks', function () {
      expect(markdown('<https://example.com>')).toEqual(
        '<https://example.com>\n'
      );
      expect(render(tag('a', { href: 'page' }, ['page']))).toEqual(
        '[page](page)\n'
      );
    });

    it('renders lists with start numbers and nesting', function () {
      const source = `3. Three
4. Four
   - Nested
     > Quoted
5. Five
`;
      expect(markdown(source)).toEqual(source);
    });

    it('renders loose lists', function () {
      const source = `- One

- Two

  More
`;
      expect(markdown(source)).toEqual(source);
    });

    it('keeps adjacent lists separate', function () {
      const content = [
        tag('ul', {}, [tag('li', {}, ['a'])]),
        tag('ul', {}, [tag('li', {}, ['b'])]),
      ];
      expect(render(content)).toEqual('- a\n\n* b\n');
      expect(html(content)).toEqual(
        '<article><ul><li>a</li></ul><ul><li>b</li></ul></article>'
      );
    });

    it('renders nested blockquotes', function () {
      const source = `> Outer
>
> > Inner
`;
      expect(html(transform(source))).toEqual(
        Markdoc.renderers.html(transform(source))
      );
    });

    it('renders fenced code with a language', function () {
      const source = '```js\nconst a = **1**;\n```\n';
      expect(markdown(source)).toEqual(source);
    });

    it('lengthens fences around content containing fences', function () {
      const content = tag('pre', {}, ['```\ninner\n```\n']);
      expect(render(content)).toEqual('````\n```\ninner\n```\n````\n');
    });

    it('collects literal text inside code blocks', function () {
      const content = tag('pre', { 'data-language': 'ruby' }, [
        tag('span', { class: 'keyword' }, ['def']),
        ' ',
        tag('em', {}, ['*x*']),
        '\n',
      ]);
      expect(render(content)).toEqual('```ruby\ndef *x*\n```\n');
    });

    it('renders tables', function () {
      const source = `| Name | Value |
| :--- | ---: |
| a | 1 |
| *b* | \`2\` |
`;
      expect(markdown(source)).toEqual(source);
    });

    it('renders Markdoc table tags', function () {
      const source = `{% table %}
* Name
* Value
---
* a
* 1
{% /table %}
`;
      expect(markdown(source)).toEqual(
        '| Name | Value |\n| --- | --- |\n| a | 1 |\n'
      );
    });

    it('renders wrappers and unknown tags as their children', function () {
      const content = tag('div', {}, [
        tag('Custom', { foo: 'bar' }, [
          tag('p', {}, ['a ', tag('span', {}, ['b'])]),
        ]),
      ]);
      expect(render(content)).toEqual('a b\n');
    });

    it('omits frontmatter', function () {
      expect(markdown('---\ntitle: x\n---\n\n# Hi')).toEqual('# Hi\n');
    });
  });

  describe('handlers', function () {
    const config: Config = {
      tags: {
        callout: { render: 'Callout', children: ['paragraph', 'list'] },
        layout: { render: 'Layout' },
        button: { render: 'CopyButton', selfClosing: true },
      },
    };

    it('converts custom components', function () {
      const source = `{% layout %}
{% callout %}
Note with **bold**

- item
{% /callout %}
{% button /%}
{% /layout %}`;

      const output = render(transform(source, config), {
        handlers: {
          Callout: (tag, { renderChildren }) =>
            new Ast.Node('blockquote', {}, renderChildren(tag.children)),
          Layout: 'children',
          CopyButton: 'none',
        },
      });

      expect(output).toEqual('> Note with **bold**\n> \n> - item\n');
    });

    it('takes precedence over built-in elements', function () {
      const content = transform('# Title\n\nText');
      const output = render(content, {
        handlers: {
          h1: (tag, { renderChildren }) =>
            new Ast.Node('paragraph', {}, [
              new Ast.Node('strong', {}, renderChildren(tag.children)),
            ]),
          p: 'none',
        },
      });
      expect(output).toEqual('**Title**\n');
    });

    it('uses own properties only', function () {
      expect(render(tag('constructor', {}, ['x']))).toEqual('x\n');
    });

    it('omits whole subtrees for none', function () {
      const content = tag('Hidden', {}, [tag('p', {}, ['secret'])]);
      expect(render(content, { handlers: { Hidden: 'none' } })).toEqual('');
    });

    it('renders nested children through handlers', function () {
      const content = tag('Outer', {}, [tag('Inner', {}, ['text'])]);
      const output = render(content, {
        handlers: {
          Outer: (tag, { renderChildren }) =>
            new Ast.Node('blockquote', {}, renderChildren(tag.children)),
          Inner: (tag, { renderChildren }) => [
            new Ast.Node('em', {}, renderChildren(tag.children)),
            new Ast.Node('text', { content: '!' }),
          ],
        },
      });
      expect(output).toEqual('> *text*!\n');
    });

    it('can render rich table cells', function () {
      const content = transform('| a |\n| - |\n| b |');
      const output = render(content, {
        handlers: {
          table: (tag) =>
            new Ast.Node('fence', {
              content: JSON.stringify(tag.children.length) + '\n',
            }),
        },
      });
      expect(output).toEqual('```\n2\n```\n');
    });

    it('propagates handler errors', function () {
      const content = tag('Broken', {}, ['x']);
      expect(() =>
        render(content, {
          handlers: {
            Broken: () => {
              throw new Error('handler failed');
            },
          },
        })
      ).toThrowError('handler failed');
    });

    it('rejects values that are not Markdown nodes', function () {
      const content = tag('Bad', {}, []);
      expect(() =>
        render(content, { handlers: { Bad: () => '**x**' as any } })
      ).toThrowError(TypeError, /must return Markdoc AST nodes/);
      expect(() =>
        render(content, { handlers: { Bad: 'children!' as any } })
      ).toThrowError(TypeError, /Invalid Markdown handler/);
    });

    it('rejects Markdoc tags, expressions, and annotations', function () {
      const tagNode = new Ast.Node('tag', {}, [], 'callout');
      const variable = new Ast.Node('text', {
        content: new Ast.Variable(['name']),
      });
      const annotated = new Ast.Node('paragraph', {}, []);
      annotated.annotations.push({ type: 'class', name: 'x', value: true });
      const comment = new Ast.Node('comment', { content: 'x' });

      for (const [returned, error] of [
        [tagNode, /Markdoc tag "callout"/],
        [variable, /unresolved Variable/],
        [annotated, /annotations/],
        [comment, /"comment" node/],
      ] as const) {
        expect(() =>
          render(tag('Bad'), { handlers: { Bad: () => returned } })
        ).toThrowError(error);
      }
    });

    it('does not mutate handler-returned nodes', function () {
      const text = new Ast.Node('text', { content: 'a' });
      const returned = [
        new Ast.Node('list', { ordered: false }, [
          new Ast.Node('item', {}, [text]),
        ]),
        new Ast.Node('list', { ordered: false }, [
          new Ast.Node('item', {}, [text]),
        ]),
      ];
      const copy = JSON.stringify(returned);
      expect(render(tag('X'), { handlers: { X: () => returned } })).toEqual(
        '- a\n\n* a\n'
      );
      expect(JSON.stringify(returned)).toEqual(copy);
    });
  });

  describe('escaping', function () {
    const values = [
      '*not em* _nor this_ ~~or this~~',
      '[not](a link) ![nor](an image)',
      '<b>not html</b> <https://not.autolink>',
      '`not code` and a \\ backslash',
      '&amp; &#42; &copy; & plain ampersand',
      '{% not_a_tag %} {{ fine }}',
      'a | b | c',
      'snake_case and __dunder__ and 2 * 3',
      'C#',
    ];

    for (const value of values) {
      it(`keeps the meaning of ${JSON.stringify(value)}`, function () {
        const content = transform('Text: {% $value %}', {
          variables: { value },
        });
        expect(html(content)).toEqual(
          Markdoc.renderers.html(
            tag('article', {}, [tag('p', {}, ['Text: ' + value])])
          )
        );
      });
    }

    const lineStarts = [
      '# not a heading',
      '- not a list',
      '+ not a list',
      '1. not a list',
      '2) not a list',
      '> not a quote',
      '---',
      '===',
      '    not code',
      '```not a fence',
    ];

    for (const value of lineStarts) {
      it(`keeps the meaning of line-start ${JSON.stringify(value)}`, function () {
        for (const content of [
          value,
          'first\n' + value,
          tag('ul', {}, [tag('li', {}, [value])]),
        ]) {
          const output = render(content);
          const tokens = markdownIt.parse(output, {});
          const types = tokens.map((t) => t.type);
          expect(types).not.toContain('heading_open');
          expect(types).not.toContain('blockquote_open');
          expect(types).not.toContain('hr');
          expect(types).not.toContain('code_block');
          expect(types).not.toContain('fence');
          expect(types.filter((t) => t.endsWith('list_open')).length).toBe(
            Tag.isTag(content) ? 1 : 0
          );
          const text = tokens
            .filter((t) => t.type === 'inline')
            .map((t) => t.content)
            .join('\n');
          expect(markdownIt.renderInline(text)).toContain(
            markdownIt.utils.escapeHtml(value.trim().split('\n').pop()!)
          );
        }
      });
    }

    it('keeps readable text readable', function () {
      expect(
        render(['Markdoc', tag('strong', {}, ['-based']), ' x-y (z) 50% done!'])
      ).toEqual('Markdoc**-based** x-y (z) 50% done!\n');
    });

    it('escapes trailing heading closing sequences', function () {
      const content = tag('h2', {}, ['Issue #']);
      expect(render(content)).toEqual('## Issue \\#\n');
      expect(html(content)).toEqual('<article><h2>Issue #</h2></article>');
    });

    it('collapses newlines in text', function () {
      expect(render('a\n\n\n    b')).toEqual('a\nb\n');
      expect(render(tag('h1', {}, ['a\nb']))).toEqual('# a b\n');
    });

    it('moves boundary whitespace outside emphasis', function () {
      const content = ['a', tag('strong', {}, [' b ']), 'c'];
      expect(render(content)).toEqual('a **b** c\n');
      expect(render(tag('em', {}, [' ']))).toEqual('');
    });

    it('preserves non-breaking spaces', function () {
      expect(render('a\xa0b')).toEqual('a&nbsp;b\n');
    });

    describe('inline code', function () {
      const values = [
        'plain',
        'one ` tick',
        'two `` ticks and one `',
        '`leading',
        'trailing`',
        ' padded ',
        '  ',
        '*not em* <b> \\ & [x](y)',
      ];

      for (const value of values) {
        it(`keeps ${JSON.stringify(value)} literal`, function () {
          const content = tag('p', {}, [tag('code', {}, [value])]);
          const [paragraph] = Markdoc.parse(render(content)).children;
          const [inline] = paragraph.children;
          const [code] = inline.children;
          expect(code.type).toEqual('code');
          expect(code.attributes.content).toEqual(value);
        });
      }

      it('omits empty code', function () {
        expect(render(['a', tag('code', {}, [])])).toEqual('a\n');
      });
    });

    it('escapes link and image fields', function () {
      const content = tag('p', {}, [
        tag('a', { href: '/a (b)\\c', title: 'say "hi" &amp;' }, ['[x]']),
        ' ',
        tag('img', { src: '/i(1).png', alt: '[alt] *x*', title: 't' }),
        ' ',
        tag('a', { href: '' }, ['empty']),
      ]);
      const output = render(content);
      expect(output).toEqual(
        '[\\[x\\]](</a (b)\\\\c> "say \\"hi\\" \\&amp;") ![\\[alt\\] \\*x\\*](/i\\(1\\).png "t") [empty](<>)\n'
      );
      // Markdoc's parser uses the raw label as alt text, so check the
      // CommonMark interpretation directly
      const [{ children }] = markdownIt
        .parse(output, {})
        .filter((t) => t.type === 'inline');
      const attrs = children!
        .filter((t) => t.type === 'link_open' || t.type === 'image')
        .map((t) => ({
          ...Object.fromEntries(t.attrs!),
          ...(t.type === 'image' && {
            alt: markdownIt.renderer.renderInlineAsText(t.children!, {}, {}),
          }),
        }));
      expect(attrs).toEqual([
        {
          href: markdownIt.normalizeLink('/a (b)\\c'),
          title: 'say "hi" &amp;',
        },
        {
          src: markdownIt.normalizeLink('/i(1).png'),
          alt: '[alt] *x*',
          title: 't',
        },
        { href: '' },
      ]);
      const text = children!
        .filter((t) => t.type === 'text')
        .map((t) => t.content);
      expect(text).toContain('[x]');
    });
  });

  describe('tables', function () {
    const table = (rows: RenderableTreeNode[][], head?: RenderableTreeNode[]) =>
      tag('table', {}, [
        ...(head
          ? [
              tag('thead', {}, [
                tag(
                  'tr',
                  {},
                  head.map((c) => tag('th', {}, [c]))
                ),
              ]),
            ]
          : []),
        tag(
          'tbody',
          {},
          rows.map((row) =>
            tag(
              'tr',
              {},
              row.map((c) => tag('td', {}, [c]))
            )
          )
        ),
      ]);

    it('renders compact tables in nested containers', function () {
      const content = tag('blockquote', {}, [
        tag('ul', {}, [tag('li', {}, [table([['1', '22']], ['a', 'bbb'])])]),
      ]);
      expect(render(content)).toEqual(
        '> - | a | bbb |\n>   | --- | --- |\n>   | 1 | 22 |\n'
      );
      expect(html(content)).toEqual(
        Markdoc.renderers.html(tag('article', {}, [content]))
      );
    });

    it('renders headerless tables with an empty header', function () {
      const content = table([['a', 'b']]);
      expect(render(content)).toEqual('|  |  |\n| --- | --- |\n| a | b |\n');
    });

    it('renders empty tables as nothing', function () {
      expect(render(tag('table'))).toEqual('');
      expect(render(tag('table', {}, [tag('tbody')]))).toEqual('');
    });

    it('pads ragged rows', function () {
      expect(render(table([['a'], ['b', 'c', 'd']], ['h']))).toEqual(
        '| h |  |  |\n| --- | --- | --- |\n| a |  |  |\n| b | c | d |\n'
      );
    });

    it('escapes pipes in cells, including code', function () {
      const content = table([[tag('code', {}, ['a|b']), 'c | d']], ['x', 'y']);
      expect(render(content)).toEqual(
        '| x | y |\n| --- | --- |\n| `a\\|b` | c \\| d |\n'
      );
      expect(html(content)).toEqual(
        Markdoc.renderers.html(tag('article', {}, [content]))
      );
    });

    it('flattens block content in cells', function () {
      const source = `{% table %}
* Heading
* Cell
---
*
  First paragraph

  - item one
  - item two

  \`\`\`js
  code()
  \`\`\`
* | nested |
  | ------ |
  | table  |
{% /table %}`;
      expect(markdown(source)).toEqual(
        '| Heading | Cell |\n| --- | --- |\n| First paragraph item one item two `code()` | nested table |\n'
      );
    });

    it('keeps extra header rows as body rows', function () {
      const content = tag('table', {}, [
        tag('thead', {}, [
          tag('tr', {}, [tag('th', {}, ['a'])]),
          tag('tr', {}, [tag('th', {}, ['b'])]),
        ]),
      ]);
      expect(render(content)).toEqual('| a |\n| --- |\n| b |\n');
    });
  });
});
