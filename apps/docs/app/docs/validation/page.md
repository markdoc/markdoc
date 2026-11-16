---
title: Validation
description: Extend Markdoc to provide custom validation for your documents.
---

# {% $markdoc.frontmatter.title %}

## Syntax validation

Markdoc supports syntax validation out of the box using the `validate` function.

```ts
validate(AstNode, ?Config) => ValidateError[]
```

\
Calling `validate` is an optional step that you can use to validate your abstract syntax tree (AST) before rendering. This is useful during testing, continuous integration, or in dev-tools like editor extensions.

{% example %}

```js
const doc = `# Heading`;

const ast = Markdoc.parse(doc);

const errors = Markdoc.validate(ast, config);

// Do something with the errors
```

{% /example %}

If your document contains a syntax error, the output of `validate` looks like this:

{% sideBySide %}

```js
const doc = `{% $invalid_code %}`;

const ast = Markdoc.parse(doc);

const errors = Markdoc.validate(ast, config);
```

```js
// errors
[
  {
    type: 'tag',
    lines: [1, 2],
    location: {
      start: { line: 1 },
      end: { line: 2 }
    },
    error: {
      id: 'missing-closing',
      level: 'critical',
      message: "Node 'callout' is missing closing"
    }
  }
];
```

{% /sideBySide %}

## Schema validation

You can also extend Markdoc with custom validation rules, by adding a `validate` function to [Node](/docs/nodes) or [Tag](/docs/tags) definitions, or to your [custom attribute types](/docs/attributes#create-a-custom-attribute).

### Validating content

Use `Node` or `Tag` `validate` functions to verify the contents are correct, particularly the `children`.

{% example %}

```js
/** @type {import('@markdoc/markdoc').Config} */
const config = {
  tags: {
    provider: {
      render: 'Provider',
      // ...
      validate(node) {
        if (node.children.length !== 1) {
          return [
            {
              id: 'provider-children',
              level: 'critical',
              message: 'Providers must only have one child.'
            }
          ];
        }
        return [];
      }
    }
  }
};
```

{% /example %}

### Validating attributes

Use [custom `Attribute` types](/docs/attributes#create-a-custom-attribute) to validate that the attributes passed to your tags and nodes are correct.

{% example %}

```js
export class ImageSrc {
  validate(value, config) {
    if (!value.startsWith('https://')) {
      return [
        {
          id: 'image-src',
          level: 'error',
          message: 'All image srcs should contain fully qualified URLs.'
        }
      ];
    }
    return [];
  }
}

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  image: {
    render: 'img',
    attributes: {
      src: {
        type: ImageSrc,
        required: true
        // ...
      }
      // ...
    }
  }
};
```

{% /example %}

## Next steps

- [Render content as HTML or React](/docs/render)
- [Check out common examples](/docs/examples)
