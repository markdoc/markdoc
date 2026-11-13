---
title: Config objects
description: Pass customizations into the rendering pipeline using a config object
---

# {% $markdoc.frontmatter.title %}

When you customize Markdoc, you must pass your customization into the rendering pipeline. The most common way to do this is to provide a config object to the [transform](/docs/render#transform) phase of rendering. 

For instance, create a config object that specifies the variable `$version` has a value of `"1.0"`. Then, pass it to the `transform` function.

{% example %}
```js
/** @type {import('@markdoc/markdoc').Config} */
const config = { variables: { version: "1.0" }};
const ast = Markdoc.parse("This is version {% $version %}");
const content = Markdoc.transform(ast, config);
const html = Markdoc.renderers.html(content);
```
{% /example %}

## Options

This table outlines the various options you can pass in a config object.

{% table %}

- Key
- Type
- Description

---

- [`nodes`](/docs/nodes)
- {% code %}{ [nodeType: [NodeType](/docs/nodes#built-in-nodes)]: [Schema](https://github.com/markdoc/markdoc/blob/60a2c831bd7ac8f2f24aabfde0b36e56e5d0dbe1/src/types.ts#L101-L109) }{% /code%}
- Register [custom nodes](/docs/nodes) in your schema

---

- [`tags`](/docs/tags)
- {% code %}{ [tagName: string]: [Schema](https://github.com/markdoc/markdoc/blob/60a2c831bd7ac8f2f24aabfde0b36e56e5d0dbe1/src/types.ts#L101-L109) }{% /code%}
- Register [custom tags](/docs/tags) in your schema

---

- [`variables`](/docs/variables)
- `{ [variableName: string]: any }`
- Register [variables](/docs/variables) to use in your document

---

- [`functions`](/docs/functions)
- {% code %}{ [functionName: string]: [ConfigFunction](https://github.com/markdoc/markdoc/blob/6bcb8a0c48a181ca9df577534d841280646cea09/src/types.ts#L31-L36) }{% /code %}
- Register [custom functions](/docs/functions) to use in your document

---

- [`partials`](/docs/partials)
- `{ [partialPath: string]: Ast.Node }`
- Register reusable pieces of content to used by the [`partial` tag](/docs/partials)

{% /table %}

## Full example

Here's an example of what a Markdoc config would look like:

```js
/** @type {import('@markdoc/markdoc').Config} */
const config = {
  nodes: {
    heading: {
      render: 'Heading',
      attributes: {
        id: { type: String },
        level: { type: Number }
      }
    }
  },
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        title: {
          type: String
        }
      }
    }
  },
  variables: {
    name: 'Dr. Mark',
    frontmatter: {
      title: 'Configuration options'
    }
  },
  functions: {
    includes: {
      transform(parameters, config) {
        const [array, value] = Object.values(parameters);

        return Array.isArray(array) ? array.includes(value) : false;
      }
    }
  },
  partials: {
    'header.md': Markdoc.parse(`# My header`)
  }
};

const content = Markdoc.transform(ast, config);
```
