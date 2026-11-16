---
title: Formatting
description: Use Markdoc.format to prettify documents or generate source content
---

# {% $markdoc.frontmatter.title %}

Markdoc comes with the ability to take a Markdoc abstract syntax tree (AST) and generate the source content. This is useful for generating Markdoc files from data, or prettifying documents.

## Examples

Take for example you want to generate a Markdoc file from from some JSON:

```json
// ./data.json
[
  [34.0522, -118.2437],
  [40.7128, -74.0060],
  [48.8566, 2.3522]
]
```

You can call `Markdoc.format` with an AST `Node` to generate the source content:

{% sideBySide %}

```js
const Markdoc = require('@markdoc/markdoc')
const DATA = require('./data.json')

const list = new Markdoc.Ast.Node(
  'list',
  {ordered: false},
  DATA.map(point => new Markdoc.Ast.Node(
    'item',
    {},
    [
      new Markdoc.Ast.Node('inline', {}, [
        new Markdoc.Ast.Node(
          'text', 
          {content: point.join(', ')}, 
          []
        )
      ])
    ]
  ))
)

Markdoc.format(list)
```

```md
- 34.0522, -118.2437
- 40.7128, -74.006
- 48.8566, 2.3522
```

{% /sideBySide %}


