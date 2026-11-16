---
title: Phases of rendering
description:
---

# {% $markdoc.frontmatter.title %}

Markdoc has three phases of rendering: `parse`, `transform`, and `render`. Each phase operates on the output of the previous phases.

Markdoc also includes a `validate` function, that you can run separately from the render phases to confirm the Markdoc document is valid.  
See the [validation docs](/docs/validation) for more info.

{% diagram type="flowchart" /%}

## Parse

```ts
parse(string) => AstNode
```

Parse transforms a raw string into an [abstract syntax tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) representing your Markdoc document. The AST contains information about your content, including where each piece of content exists within the document.

An example AST would look like this:

```json
{
  "type": "document",
  "attributes": {},
  "children": [
    {
      "type": "paragraph",
        "attributes": {},
        "children": [...],
        "lines": [0, 2],
        "location": {
          "start": {
            "line": 0
          },
          "end": {
            "line": 2
          }
        },
        "errors": [],
        "inline": false,
    }
  ],
  "lines": [],
  "errors": [],
  "inline": false
}
```

Check this out for yourself in the [developer playground](/sandbox?mode=ast).

AST node instances also include helpful functions, like `walk`, which can be useful for traversing and mutating your AST.

```js
const ast = Markdoc.parse(document);

for (const node of ast.walk()) {
  // do something with each node
}
```

## Transform

```ts
transform(AstNode | AstNode[], ?Config) => RenderableTreeNode | RenderableTreeNode[]
```

Transform takes an abstract syntax tree and transforms it into a renderable tree, a serializable intermediate representation of what will eventually be rendered. This object is useful for computing things like a [table of contents](/docs/examples#table-of-contents), or passing over the wire to your client.

The transform step is also responsible for resolving variables into static, scalar values (string, boolean, object, and so on.).

An example renderable tree will look like this:

```json
{
  "name": "article",
  "attributes": {},
  "children": [
    {
      "name": "h1",
      "attributes": {},
      "children": ["Header"],
      "$$mdtag": true
    }
  ],
  "$$mdtag": true
}
```

You can see a more advanced renderable tree in the [developer playground](/sandbox?mode=transform).

## Render

Render takes in a renderable tree and converts it into rendered output. For `html`, that means creating an HTML document as a string. For `react`, it means creating a [React element](https://reactjs.org/docs/render-elements.html).

You can create your own renderer by creating a function that takes in a renderable tree as a parameter and returns your desired output.

An example `html` output would look like this:

```html
<h1>Getting started</h1>

<p>Run this command to install the Markdoc library:</p>
```

### React

```ts
renderers.react(RenderableTreeNode | RenderableTreeNode[]) => React.Node
```

Markdoc supports rendering [React](https://reactjs.org/) out-of-the-box. You can see the React renderer in action in the [developer playground](/sandbox?mode=preview).

\
To render React, first create a renderable tree from your document calling `transform`. You can do this from the server or client.

{% example %}

```js
const tags = {
  callout: {
    render: 'Callout',
    attributes: {}
  }
};

const doc = `
{% callout %}
Attention, over here!
{% /callout %}
`;

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, { tags });
```

{% /example %}

\
Then, call `Markdoc.renderers.react` with the renderable tree from your client application. Along with `content` and `React`, you'll need to provide the `components` object as an argument. The `components` object specifies a mapping from your tags and nodes to the corresponding React component.

{% sideBySide %}

```jsx
import Markdoc from '@markdoc/markdoc';
import React from 'react'; // or 'preact'

function Callout({ children }) {
  return <div className="callout">{children}</div>;
}

function MyApp() {
  return Markdoc.renderers.react(content, React, {
    components: {
      Callout: Callout
    }
  });
}
```

{% item %}

#### Rendered output

{% callout %}
Attention, over here!
{% /callout %}
{% /item %}

{% /sideBySide %}

### HTML

```ts
renderers.html(RenderableTreeNode | RenderableTreeNode[]) => string
```

Markdoc supports rendering HTML out-of-the-box. Because the HTML renderer outputs your HTML document as a string, you can use [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) with no extra configuration.

\
To render HTML, first create a renderable tree from your content by calling `transform`:

{% example %}

```js
const doc = `
# Getting started

Run this command to install the Markdoc library:
`;

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast);
```

{% /example %}

\
Then, call `Markdoc.renderers.html` with your renderable tree, which will create the corresponding HTML document.

{% sideBySide %}

```js
const express = require('express');
const Markdoc = require('@markdoc/markdoc');

const app = express();

app.get('/docs/getting-started', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        ${Markdoc.renderers.html(content)}
      </body>
    </html>
  `);
});
```

{% item %}

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Getting started</h1>
    <p>Run this command to install the Markdoc library:</p>
  </body>
</html>
```

{% /item %}

{% /sideBySide %}

### Create your own

Because Markdoc renderers are regular functions, you can create a custom one for whatever your use case requires.  
Try creating your own for [Vue](https://vuejs.org/), [Svelte](https://svelte.dev/), [Spectacle](https://formidable.com/open-source/spectacle/), or anything else you can think of.

## Next steps

- [Validate your content](/docs/validation)
- [Check out common examples](/docs/examples)
- [Build a documentation site quickly](/docs/nextjs)
