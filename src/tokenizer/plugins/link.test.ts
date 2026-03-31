import Tokenizer from '..';

describe('MarkdownIt Link plugin', function () {
  const tokenizer = new Tokenizer();

  function parse(example) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    return tokenizer.tokenize(content);
  }

  function getInlineError(tokens) {
    return tokens.find((token) => token.type === 'inline')?.errors?.[0];
  }

  it('rejects variables in markdown link urls', function () {
    const tokens = parse(`[Link](https://{% $variable.custom_value %})`);
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects self-closing tags in markdown link urls', function () {
    const tokens = parse(`[Link](https://example.com/{% tag /%})`);
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects non self-closing tags in markdown link urls', function () {
    const tokens = parse(
      `[Link](https://example.com/{% tag %}content{% /tag %})`
    );
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });
});
