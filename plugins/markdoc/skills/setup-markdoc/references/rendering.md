# Rendering pipeline

Add `@markdoc/markdoc` with the application's package manager if it is missing.
Preserve its dependency ranges and release policies. The React runtime is needed
for React rendering. TypeScript consumers also need `@types/react` for Markdoc's
public declarations, even when using only HTML output; package managers may
install this peer dependency automatically.

## Parse, validate, transform, render

```js
import Markdoc from '@markdoc/markdoc';

const source = '# Install {% $product %}\n\nFollow the setup guide.';
const config = { variables: { product: 'Example' } };

const ast = Markdoc.parse(source);
const issues = await Markdoc.validate(ast, config);
const failures = issues.filter(({ error }) =>
  error.level === 'error' || error.level === 'critical'
);
if (failures.length) {
  throw new Error(failures.map(({ error }) => error.message).join('\n'));
}

const content = await Markdoc.transform(ast, config);
const html = Markdoc.renderers.html(content);
```

Use `require('@markdoc/markdoc')` in a CommonJS application. Put asynchronous
operations inside the application's async entry point when top-level `await`
is unavailable.

Validation returns diagnostics. Keep their `error`, `lines`, and location
information when reporting them. Some schema issues, such as disallowed
children, are warnings; follow the application's policy for those. Validation
checks Markdoc's syntax and schema; it is not a general HTML or URL sanitizer.

For React, pass the transformed `content` to the React renderer:

```js
import React from 'react';

const element = Markdoc.renderers.react(content, React);
```

For custom components, the core renderer accepts a third argument with a
`components` map. Its keys match schema `render` names, such as `Callout`,
rather than source tag names such as `callout`. Framework adapters can handle
that map themselves; preserve the application's existing convention.

References: [configuration](https://markdoc.dev/docs/config),
[validation](https://markdoc.dev/docs/validation),
[rendering](https://markdoc.dev/docs/render).
