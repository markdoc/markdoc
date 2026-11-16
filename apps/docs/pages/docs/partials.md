---
title: Partials
description:
---

# {% $markdoc.frontmatter.title %}

Markdoc uses partials to reuse content across documents. A separate Markdoc file stores the content, and it's referenced from within the partial tag.

Here's an example of including the `header.md` file as a partial.
{% example %}

```
{% partial file="header.md" /%}
```

{% /example %}

#### Registering partials

You define partials by creating a mapping from the file name to an abstract syntax tree (AST) node in your [`config` object](/docs/config). The default `partial` [tag](/docs/tags) looks at this config to include the right content.

{% example %}

```js
/** @type {import('@markdoc/markdoc').Config} */
const config = {
  partials: {
    'header.md': Markdoc.parse(`# My header`)
  }
};

const doc = `
{% partial file="header.md" /%}
`;

const ast = Markdoc.parse(doc);

const content = Markdoc.transform(ast, config);
```

{% /example %}

If you want the `partial` tag to behave differently, you can override it in `Config.tags`.

#### Passing variables

Partials are like any other tags, so you can pass [variables](/docs/variables) as [attributes](/docs/attributes) to them such as:

{% example %}

```
{% partial file="header.md" variables={name: "My header name"} /%}
```

{% /example %}

and access the variables as you would in a regular Markdoc document:

{% example %}

```
{% $name %}
```

{% /example %}
