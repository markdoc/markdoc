---
title: Nodes
description:
---

# {% $markdoc.frontmatter.title %}


Nodes are elements that Markdoc inherits from Markdown, specifically the [CommonMark specification](https://commonmark.org/). Markdoc nodes enable you to customize how your document renders without using any custom syntax—it consists entirely of Markdown. Customizing nodes lets you extend your implementation incrementally.


## Built-in nodes

Markdoc comes out of the box with built-in nodes for each of the [CommonMark](https://commonmark.org/) types:

{% table %}

- Node type
- Attributes

---

- `document`
- [`frontmatter`](/docs/frontmatter)

---

- `heading`
- `level`

---

- `paragraph`
- —

---

- `hr`
- —

---

- `image`
- `src`

  `alt`

  `title`

---

- `fence`
- 
  {% table %}
  ---
  - `content`
  - A string containing the plain text inside the fence.
  ---
  - `language`
  - The programming language used for syntax highlighting the fence contents.
  ---
  - `process`
  - Determine whether to parse Markdoc tags within a fence. Set `process=false` to treat the content within a fence as plain text. 
  {% /table %}

---

- `blockquote`
- —

---

- `list`
- `ordered`

---

- `item`
- —

---

- `table`
- —

---

- `thead`
- —

---

- `tbody`
- —

---

- `tr`
- —

---

- `td`
- `align`

  `colspan`
  
  `rowspan`

---

- `th`
- `align`

  `width`

---

- `inline`
- —

---

- `strong`
- —

---

- `em`
- —

---

- `s`
- —

---

- `link`
- `href`

  `title`

---

- `code`
- `content`

---

- `text`
- `content`

---

- `hardbreak`
- —

---

- `softbreak`
- —

---

- `error`
- —

{% /table %}


## Customizing Markdoc nodes

You define custom nodes by passing a custom Node to your [`config` object](/docs/config), like:

```js
import { heading } from './schema/Heading.markdoc';
import * as components from './components';

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  nodes: {
    heading
  }
};

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, config);

const children = Markdoc.renderers.react(content, React, { components });
```

where `heading` looks something like:

```js
// ./schema/Heading.markdoc.js

import { Tag } from '@markdoc/markdoc';

// Or replace this with your own function
function generateID(children, attributes) {
  if (attributes.id && typeof attributes.id === 'string') {
    return attributes.id;
  }
  return children
    .filter((child) => typeof child === 'string')
    .join(' ')
    .replace(/[?]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export const heading = {
  children: ['inline'],
  attributes: {
    id: { type: String },
    level: { type: Number, required: true, default: 1 }
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.transformChildren(config);

    const id = generateID(children, attributes);

    return new Tag(
      `h${node.attributes['level']}`,
      { ...attributes, id },
      children
    );
  }
};
```

After registering this custom node, you can then use it in your Markdoc, like:

{% sideBySide %}

{% example %}

```md
#### My header
```

{% /example %}

#### My header

{% /sideBySide %}

## Options

These are the optional fields you can use to customize your `Node`:

{% table %}

- Option
- Type
- Description {% width="40%" %}

---

- `render`
- `string`
- Name of the output (for example, HTML tag, React component name) to render

---

- `children`
- `string[]`
- Determines which tag or node types can be rendered as children of this node. Used in schema validation.

---

- `attributes`
- `{ [string]: SchemaAttribute }`
- Determines which [values (and their types)](/docs/attributes) can be passed to this node.

---

- `transform`
- ```js
  (Ast.Node, ?Options) =>
    | RenderableTreeNode
    | RenderableTreeNode[]
    | null
  ```
- Customize the Markdoc transform function for this node, returning the custom output you want to eventually render. This is called during the [`transform` step](/docs/render#transform).

---

- `validate`
- ```js
  (Node, ?Options) => ValidationError[];
  ```
- Extend Markdoc validation. This validates that the content meets validation requirements, and is called during the [`validate` step](/docs/render#validate)

{% /table %}

## Next steps

- [Create custom tags](/docs/tags)
- [Customize nodes with annotations](/docs/syntax#annotations)
