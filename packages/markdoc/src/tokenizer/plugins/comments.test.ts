import Tokenizer from '..';

describe('MarkdownIt Comments plugin', () => {
  const tokenizer = new Tokenizer({ allowComments: true });

  function parse(example) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    return tokenizer.tokenize(content);
  }

  describe('inline comments', () => {
    const output = [
      { type: 'paragraph_open' },
      {
        type: 'inline',
        children: [
          { type: 'text', content: 'this is a test ' },
          { type: 'comment', content: 'example comment' },
          { type: 'text', content: ' foo' },
        ],
      },
      { type: 'paragraph_close' },
    ];

    it('simple inline comment', () => {
      const example = parse(`
      this is a test <!-- example comment --> foo
      `);

      expect(example).toDeepEqualSubset(output);
    });

    it('inline comment with a newline', () => {
      const example = parse(`
      this is a test <!-- 
        example comment
        --> foo
      `);

      expect(example).toDeepEqualSubset(output);
    });
  });

  describe('block comments', () => {
    const output = [
      { type: 'paragraph_open' },
      { type: 'inline' },
      { type: 'paragraph_close' },
      { type: 'comment', content: 'example comment' },
      { type: 'paragraph_open' },
      { type: 'inline', content: 'foo' },
      { type: 'paragraph_close' },
    ];

    it('simple block comment after a paragraph', () => {
      const example = parse(`
      this is a test

      <!--
      example comment
      -->
      
      foo
      `);

      expect(example).toDeepEqualSubset(output);
    });

    it('block comment with ending on same line as content', () => {
      const example = parse(`
      this is a test

      <!--
      example comment -->

      foo
      `);

      expect(example).toDeepEqualSubset(output);
    });

    it('block comment one one line', () => {
      const example = parse(`
      this is a test

      <!-- example comment -->

      foo
      `);

      expect(example).toDeepEqualSubset(output);
    });

    it('block comment across multiple lines with blank lines', () => {
      const actual = tokenizer.tokenize(
        `
      foo <!-- example

      comment --> bar
      `.trim(),
      );

      const expected = [
        { type: 'paragraph_open' },
        {
          type: 'inline',
          children: [{ type: 'text', content: 'foo <!-- example' }],
        },
        { type: 'paragraph_close' },
        { type: 'paragraph_open' },
        { type: 'inline', content: 'comment --> bar' },
        { type: 'paragraph_close' },
      ];

      expect(actual).toDeepEqualSubset(expected);
    });
  });
});
