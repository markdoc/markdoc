import Tokenizer from '..';

describe('MarkdownIt Annotations plugin', function () {
  const tokenizer = new Tokenizer();

  function parse(example) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    return tokenizer.tokenize(content);
  }

  describe('parsing containers in content', function () {
    it('with a simple container', function () {
      const example = parse(`
      {% test %}
      This is a test
      {% /test %}
      `);

      expect(example).toDeepEqualSubset([
        {
          type: 'tag_open',
          info: 'test',
          nesting: 1,
          block: true,
          children: null,
          hidden: false,
          map: [0, 1],
          meta: { tag: 'test', attributes: null },
        },
        { type: 'paragraph_open' },
        { type: 'inline' },
        { type: 'paragraph_close' },
        {
          type: 'tag_close',
          info: '/test',
          nesting: -1,
          block: true,
          children: null,
          hidden: false,
          map: [2, 3],
          meta: { tag: 'test' },
        },
      ]);
    });

    it('with an ID and class', function () {
      const example = parse(`
      {% test #foo .bar %}
      This is a test
      {% /test %}`);

      expect(example).toDeepEqualSubset([
        {
          type: 'tag_open',
          meta: {
            tag: 'test',
            attributes: [
              { type: 'attribute', name: 'id', value: 'foo' },
              { type: 'class', name: 'bar', value: true },
            ],
          },
        },
        { type: 'paragraph_open' },
        { type: 'inline' },
        { type: 'paragraph_close' },
        { type: 'tag_close' },
      ]);
    });

    it('with a self-closing container', function () {
      const example = parse(`This is a test\n{% test /%}`);
      expect(example).toDeepEqualSubset([
        { type: 'paragraph_open' },
        { type: 'inline' },
        { type: 'paragraph_close' },
        { type: 'tag', meta: { tag: 'test', attributes: null } },
      ]);

      const example2 = parse(`{% test /%}`);
      expect(example2).toDeepEqualSubset([
        { type: 'tag', meta: { tag: 'test', attributes: null } },
      ]);
    });

    it('with a self-closing container with annotations', function () {
      const example = parse(`
      This is a test
      {% test #foo .bar baz=1 /%}
      This is another test
      `);

      expect(example).toDeepEqualSubset([
        { type: 'paragraph_open' },
        { type: 'inline' },
        { type: 'paragraph_close' },
        {
          type: 'tag',
          meta: {
            tag: 'test',
            attributes: [
              { type: 'attribute', name: 'id', value: 'foo' },
              { type: 'class', name: 'bar', value: true },
              { type: 'attribute', name: 'baz', value: 1 },
            ],
          },
        },
        { type: 'paragraph_open' },
        { type: 'inline' },
        { type: 'paragraph_close' },
      ]);
    });

    describe('multiline', function () {
      it('basic', function () {
        const example = parse(`
        {% test #foo .bar
          baz=1 %}
        This is a test
        {% /test %}
        `);

        expect(example).toDeepEqualSubset([
          {
            type: 'tag_open',
            nesting: 1,
            meta: {
              attributes: [
                { type: 'attribute', name: 'id', value: 'foo' },
                { type: 'class', name: 'bar', value: true },
                { type: 'attribute', name: 'baz', value: 1 },
              ],
              tag: 'test',
            },
          },
          { type: 'paragraph_open', tag: 'p', nesting: 1 },
          {
            type: 'inline',
            nesting: 0,
            children: [{ type: 'text', nesting: 0, content: 'This is a test' }],
          },
          { type: 'paragraph_close', tag: 'p', nesting: -1 },
          { type: 'tag_close', nesting: -1, meta: { tag: 'test' } },
        ]);

        expect(example.length).toEqual(5);
        expect(example[2].children.length).toEqual(1);
      });
    });

    describe('inline', function () {
      it('on a line by itself', function () {
        const example = parse('{% foo %}bar{% /foo %}');
        expect(example).toDeepEqualSubset([
          { type: 'paragraph_open' },
          {
            type: 'inline',
            children: [
              {
                type: 'tag_open',
                info: 'foo',
                nesting: 1,
                meta: { tag: 'foo' },
              },
              { type: 'text', content: 'bar' },
              { type: 'tag_close', info: '/foo' },
            ],
          },
          { type: 'paragraph_close' },
        ]);
      });

      it('with a paragraph', function () {
        const example = parse('Example {% foo %}bar{% /foo %} baz');

        expect(example).toDeepEqualSubset([
          { type: 'paragraph_open' },
          {
            type: 'inline',
            children: [
              { type: 'text', content: 'Example ' },
              {
                type: 'tag_open',
                info: 'foo',
                nesting: 1,
                block: false,
                children: null,
                hidden: false,
                meta: { attributes: null, tag: 'foo' },
              },
              { type: 'text', content: 'bar' },
              {
                type: 'tag_close',
                info: '/foo',
                nesting: -1,
                block: false,
                children: null,
                hidden: false,
                meta: { tag: 'foo' },
              },
              { type: 'text', content: ' baz' },
            ],
          },
          { type: 'paragraph_close' },
        ]);
      });

      it('with two in succession', function () {
        const example = parse(
          'Example {% foo %}bar{% /foo %}{% test %}test{% /test %} baz'
        );
        expect(example).toDeepEqualSubset([
          { type: 'paragraph_open' },
          {
            type: 'inline',
            children: [
              { type: 'text', content: 'Example ' },
              {
                type: 'tag_open',
                info: 'foo',
                nesting: 1,
                meta: { attributes: null, tag: 'foo' },
              },
              { type: 'text', content: 'bar' },
              {
                type: 'tag_close',
                info: '/foo',
                nesting: -1,
                meta: { tag: 'foo' },
              },
              {
                type: 'tag_open',
                info: 'test',
                nesting: 1,
                meta: { attributes: null, tag: 'test' },
              },
              { type: 'text', content: 'test' },
              {
                type: 'tag_close',
                info: '/test',
                nesting: -1,
                meta: { tag: 'test' },
              },
              { type: 'text', content: ' baz' },
            ],
          },
          { type: 'paragraph_close' },
        ]);
      });

      it('with markdown inside', function () {
        const example = parse(
          'Example {% foo %}this is a *test*{% /foo %} baz'
        );
        expect(example).toDeepEqualSubset([
          { type: 'paragraph_open' },
          {
            type: 'inline',
            children: [
              { type: 'text', content: 'Example ' },
              {
                type: 'tag_open',
                info: 'foo',
                nesting: 1,
                meta: { attributes: null, tag: 'foo' },
              },
              { type: 'text', content: 'this is a ' },
              { type: 'em_open' },
              { type: 'text', content: 'test' },
              { type: 'em_close' },
              {
                type: 'tag_close',
                info: '/foo',
                nesting: -1,
                meta: { tag: 'foo' },
              },
              { type: 'text', content: ' baz' },
            ],
          },
          { type: 'paragraph_close' },
        ]);
      });
    });

    describe('fence', function () {
      it('simple with no tags', function () {
        const example = parse('```\nhello\n```');
        expect(example).toDeepEqualSubset([
          {
            type: 'fence',
            children: [
              {
                type: 'text',
                content: 'hello\n',
              },
            ],
          },
        ]);
      });

      it('simple with one tag', function () {
        const example = parse('```\nhello {% foo %}bar{% /foo %}\n```');
        expect(example).toDeepEqualSubset([
          {
            type: 'fence',
            children: [
              {
                type: 'text',
                content: 'hello ',
              },
              {
                type: 'tag_open',
                info: '{% foo %}',
              },
              {
                type: 'text',
                content: 'bar',
              },
              {
                type: 'tag_close',
                info: '{% /foo %}',
              },
            ],
          },
        ]);
      });

      it('unclosed tag', function () {
        const example = parse('```\nhello {%\n```');
        // unclosed tags should not result in crashes
        expect(example).toDeepEqualSubset([
          {
            type: 'fence',
            children: [
              {
                type: 'text',
                tent: 'hello {%\n',
              },
            ],
          },
        ]);
      });
    });
  });

  describe('parsing inline annotations', function () {
    it('with a header', function () {
      const example = parse('# This is a test {% #foo .bar .baz %}');
      expect(example).toDeepEqualSubset([
        { type: 'heading_open' },
        {
          type: 'inline',
          children: [
            { type: 'text', content: 'This is a test ' },
            {
              type: 'annotation',
              meta: {
                tag: undefined,
                attributes: [
                  { type: 'attribute', name: 'id', value: 'foo' },
                  { type: 'class', name: 'bar', value: true },
                  { type: 'class', name: 'baz', value: true },
                ],
              },
            },
          ],
        },
        { type: 'heading_close' },
      ]);
    });

    it('with a header and keys', function () {
      const example = parse('# This is a test {% #foo .bar .baz foo=2 %}');
      expect(example).toDeepEqualSubset([
        { type: 'heading_open' },
        {
          type: 'inline',
          children: [
            { type: 'text', content: 'This is a test ' },
            {
              type: 'annotation',
              meta: {
                tag: undefined,
                attributes: [
                  { type: 'attribute', name: 'id', value: 'foo' },
                  { type: 'class', name: 'bar', value: true },
                  { type: 'class', name: 'baz', value: true },
                  { type: 'attribute', name: 'foo', value: 2 },
                ],
              },
            },
          ],
        },
        { type: 'heading_close' },
      ]);
    });
  });
});
