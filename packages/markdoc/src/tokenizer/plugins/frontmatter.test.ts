import Tokenizer from '..';

describe('MarkdownIt frontmatter plugin', () => {
  const tokenizer = new Tokenizer();

  function parse(example) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    return tokenizer.tokenize(content);
  }

  it('parsing frontmatter', () => {
    const example = parse(`
    ---
    test: true
    ---

    # Test
    `);

    expect(example.length).toEqual(4);
    expect(example[0]).toDeepEqualSubset({
      type: 'frontmatter',
      content: 'test: true',
      level: 0,
      map: [0, 2],
    });
  });

  it('parsing frontmatter only', () => {
    const example = parse(`
    ---
    test: true
    foo: bar
    ---
    `);

    expect(example.length).toEqual(1);
    expect(example[0]).toDeepEqualSubset({
      type: 'frontmatter',
      level: 0,
      map: [0, 3],
    });
  });

  it('spaces at end', () => {
    const example = parse(`
    ---   
    test: true
    ---   

    # Test
    `);

    expect(example.length).toEqual(4);
    expect(example[0]).toDeepEqualSubset({
      type: 'frontmatter',
      content: 'test: true',
      level: 0,
      map: [0, 2],
    });
  });

  it('missing closing', () => {
    const example = parse(`
    ---
    test: true

    # Test
    `);

    expect(example.length).toEqual(7);
    expect(example[0].type).toEqual('hr');
  });

  it('missing opening', () => {
    const example = parse(`
    test: true
    ---

    # Test
    `);

    expect(example.length).toEqual(7);
    expect(example[0].type).toEqual('paragraph_open');
  });
});
