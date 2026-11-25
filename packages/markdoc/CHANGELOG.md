# @markdoc/markdoc

## 0.6.0

### Minor Changes

- 24ddafb: The built-in `fence` and `code` nodes now render with their schema's `render` value instead of always rendering `pre` and `code`, so `{ ...nodes.fence, render: 'CodeBlock' }` renders a `CodeBlock`, including fences with `process=false`. If you spread these schemas and change `render` but still expect `pre` or `code` elements, remove the `render` override.

### Patch Changes

- 89aa830: Reduce overhead when resolving and transforming documents by copying attribute values more efficiently and skipping unnecessary work for empty slots. Preserve independent node copies, constructor defaults, and protection against inherited property setters.
- b5cc112: Fix `renderers.reactStatic()` throwing from the built package when a bundler renames its tag resolver. Generated React code now binds the resolver explicitly, and custom resolver functions no longer need to be named `tagName`.
- 635fb76: Fix slow formatting of text that contains a long run of `#` characters. `Markdoc.format` now escapes heading marks in linear time instead of quadratic time, and its output is unchanged.
- 0c1fe30: Use iterative AST traversal to reduce parsing and validation overhead and avoid recursive walker stack overflows on deeply nested trees. Preserve traversal order, mutation behavior, custom node walkers, and independent validation parent arrays.
- 8a27c52: Upgrade the bundled markdown-it parser to 15.0.3.
- 9a9826c: Allow HTML element names in the React renderer component map types, matching the existing runtime behavior.

## 0.5.14

### Patch Changes

- cfe43ee: Harden heading level handling and HTML tag and attribute name serialization in the HTML renderer. The HTML renderer also omits `null` and `undefined` attribute values.

## 0.5.13

### Patch Changes

- 11024d5: Fix a prototype-based attribute validation bypass by treating parsed attributes as own data properties and rejecting reserved attribute names. Resolve serialized Markdoc function and variable values in attributes.
