# Custom tags and rendering

These examples use the core `@markdoc/markdoc` API. Follow the application's
existing schema organization and framework adapter when registering a tag.

## HTML tag

This example renders an HTML callout using a standard `aside` element:

```js
import Markdoc from '@markdoc/markdoc';

const source = '{% callout type="warning" %}\nRead this first.\n{% /callout %}';
const config = {
  tags: {
    callout: {
      render: 'aside',
      children: ['paragraph', 'list', 'tag'],
      attributes: {
        type: {
          type: String,
          matches: ['note', 'warning'],
          default: 'note',
          render: 'data-type'
        }
      }
    }
  }
};

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

Validation returns diagnostics; it does not throw for every invalid document.
Keep each diagnostic's `error`, `lines`, and location information when reporting
it. Some schema issues, such as disallowed children, are warnings; follow the
application's policy for those. Validation checks Markdoc's syntax and schema;
it is not a general HTML or URL sanitizer.

Parse static source once where the application lifecycle permits, then transform
with the variables for the current render. Keep reusable ASTs unchanged in custom
application code.

## React components

Set a custom tag's `render` to a component name and supply a matching component
to the React renderer:

```jsx
import Markdoc from '@markdoc/markdoc';
import React from 'react';

function Callout({ children, type }) {
  return <aside data-type={type}>{children}</aside>;
}

const config = {
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        type: { type: String, matches: ['note', 'warning'], default: 'note' }
      }
    }
  }
};

const ast = Markdoc.parse('{% callout type="warning" %}\nRead this first.\n{% /callout %}');
const content = await Markdoc.transform(ast, config);
const element = Markdoc.renderers.react(content, React, {
  components: { Callout }
});
```

HTML rendering emits element names; it does not execute React components.
The Next.js adapter has its own component registration convention: its schema
accepts component functions directly in `render` and builds the map for you.

## Extending schemas

- `config.tags` registers `{% custom %}` syntax. `config.nodes` customizes
  built-in Markdown elements such as headings and fences.
- Use `attributes` to declare types, defaults, required values, and allowed
  values. Use `render: false` for an attribute that is only document data.
- `children` lists AST node types, such as `paragraph`, `list`, and `tag`.
  It does not list custom tag names or React component names.
- When extending a built-in node, start from its exported schema, such as
  `Markdoc.nodes.heading`, to preserve behavior you are not changing.
- A custom `transform(node, config)` replaces that schema's default transform.
  Use `node.transformAttributes(config)` and `node.transformChildren(config)`
  when retaining its declared attributes and transformed children. Return a
  `Markdoc.Tag` or another supported renderable value, not an unresolved AST.

Custom functions belong in `config.functions`; their `transform(parameters)`
receives positional arguments under numeric keys. For example:

```js
const functions = {
  uppercase: {
    transform(parameters) {
      const value = parameters[0];
      return typeof value === 'string' ? value.toUpperCase() : value;
    }
  }
};
```

Call it with `{% uppercase($product.name) %}` after including `functions` in the
same config used to validate and transform the document.

References: [configuration](https://markdoc.dev/docs/config),
[tags](https://markdoc.dev/docs/tags),
[validation](https://markdoc.dev/docs/validation),
[rendering](https://markdoc.dev/docs/render).
