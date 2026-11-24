# Authoring Markdoc

Use the consuming application's schema as the contract for its content. The
examples below use built-ins, except `callout`, which needs a tag registration.

## Tags and attributes

```markdoc
{% callout type="warning" %}
Keep a copy of your configuration before replacing it.
{% /callout %}

{% partial file="shared/setup.md" /%}
```

Use double-quoted strings for attribute values. Numbers and booleans are values,
not quoted text: `level=2`, `enabled=true`. A tag containing content needs a
closing tag; self-closing tags end with `/%}` as above.
Separate block tags from their surrounding paragraphs with blank lines.

## Variables and conditionals

```markdoc
# Install {% $product.name %}

{% if equals($platform, "node") %}
Use the Node.js integration.
{% else /%}
Use the HTTP API.
{% /if %}
```

The application supplies `config.variables`. Use `equals`, `and`, `or`, `not`,
and `default` for expressions rather than JavaScript operators such as `===` or
`&&`. Markdoc considers only `undefined`, `null`, and `false` falsey; `0` and an
empty string are truthy. Additional functions need a `config.functions` entry.
The `else` tag is self-closing, including when it supplies another condition.

## Partials

The core library resolves partial names through `config.partials`, whose values
are parsed ASTs:

```js
const config = {
  partials: {
    'shared/setup.md': Markdoc.parse('Install the package before continuing.')
  }
};
```

Use the application's existing file-loading convention to build that mapping.
A `file` attribute is not automatically an unrestricted filesystem read.
Partials can receive variables:

```markdoc
{% partial file="shared/setup.md" variables={product: "Example"} /%}
```

## Literal examples

When a code fence demonstrates Markdoc syntax, disable processing on the fence
so its tags are displayed literally:

````markdoc
```markdoc {% process=false %}
{% callout type="note" %}
Example content.
{% /callout %}
```
````

## Frontmatter

Core `Markdoc.parse` stores YAML text in `ast.attributes.frontmatter`; it does
not automatically make YAML fields available as variables. Use the application's
existing frontmatter parser and namespace. The Next.js integration exposes its
parsed frontmatter through `$markdoc.frontmatter`, for example:

```markdoc
---
title: Installation
description: Install and configure the package.
---

# {% $markdoc.frontmatter.title %}
```

References: [syntax](https://markdoc.dev/docs/syntax),
[variables](https://markdoc.dev/docs/variables),
[functions](https://markdoc.dev/docs/functions),
[partials](https://markdoc.dev/docs/partials).
