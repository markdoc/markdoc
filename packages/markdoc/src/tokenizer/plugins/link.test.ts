import Tokenizer from '..';

describe('MarkdownIt Link plugin', () => {
  function parse(
    example: string,
    tokenizer: Tokenizer = new Tokenizer({ allowLinkValidation: true }),
  ) {
    const content = example.replace(/\n\s+/gm, '\n').trim();
    return tokenizer.tokenize(content);
  }

  function getInlineError(tokens) {
    return tokens.find((token) => token.type === 'inline')?.errors?.[0];
  }

  it('accepts valid link urls and markdoc tag in one paragraph', () => {
    const tokens = parse(`The link is https://example.com. {% tag /%})`);
    expect(getInlineError(tokens)).toBeUndefined();
  });

  it('accepts raw tag content in markdown link format', () => {
    const tokens = parse(`[Link]({% tag %})`);
    expect(getInlineError(tokens)).toBeUndefined();
  });

  it('rejects plain link url with tags', () => {
    const tokens = parse(`https://example.com/{% tag %}content{% /tag %})`);
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects URL with parenthesis in link', () => {
    const tokens = parse(
      `https://en.wikipedia.org/wiki/Exam_(disambiguation){% tag /%}`,
    );
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects variables in markdown link urls', () => {
    const tokens = parse(`[Link](https://{% $variable.custom_value %})`);
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects self-closing tags in markdown link urls', () => {
    const tokens = parse(`[Link](https://example.com/{% tag /%})`);
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects non self-closing tags in markdown link urls', () => {
    const tokens = parse(
      `[Link](https://example.com/{% tag %}content{% /tag %})`,
    );
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });

  it('rejects custom protocols defined in the config with markdoc variable', () => {
    const tokenizer = new Tokenizer({
      allowLinkValidation: true,
      linkValidationOptions: { validatedProtocols: ['vscode'] },
    });
    const tokens = parse(
      `[Link](vscode://{% $variable.custom_value %})`,
      tokenizer,
    );
    expect(getInlineError(tokens)).toDeepEqualSubset({
      id: 'href-format-invalid',
      level: 'error',
      message:
        "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.",
    });
  });
});
