// Records what @markdoc/markdoc produces for a document beyond its AST:
// the transform output, the HTML rendering of it, the validation errors and
// the formatted source. Shared by the fixture generators.

// Runs f and returns its result, or { error } if it throws, so one input
// that JS can't handle doesn't stop the others.
function attempt(f) {
  try {
    return f();
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

export function outputs(Markdoc, input, config, parserArgs, formatOptions) {
  const parse = () => Markdoc.parse(input, parserArgs);
  const tree = attempt(() => Markdoc.transform(parse(), config));
  return {
    transform: tree?.error ? tree : JSON.stringify(tree),
    html: tree?.error ? tree : attempt(() => Markdoc.renderers.html(tree)),
    validate: attempt(() => JSON.stringify(Markdoc.validate(parse(), config))),
    format: attempt(() => Markdoc.format(parse(), formatOptions)),
  };
}
