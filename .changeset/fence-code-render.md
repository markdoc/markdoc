---
'@markdoc/markdoc': minor
---

The built-in `fence` and `code` nodes now render with their schema's `render` value instead of always rendering `pre` and `code`, so `{ ...nodes.fence, render: 'CodeBlock' }` renders a `CodeBlock`, including fences with `process=false`. If you spread these schemas and change `render` but still expect `pre` or `code` elements, remove the `render` override.
