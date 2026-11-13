---
title: Tags
description: Use tags to extend Markdown. With tags you can use native Markdoc components or custom-built React components.
---

# {% $markdoc.frontmatter.title %}

Tags are a syntactic extension of standard Markdown. You can use native Markdoc tags, like [tables](#table), [conditionals](#if/else), and [partials](#partial), or create custom React components.

Similar to React components and HTML elements, tags are composable, and you can customize them with [attributes](/docs/attributes).

{% example %}

```md
{% if true %}

{% callout type="note" %}
Tags are composable!
{% /callout %}

{% else /%}

{% callout type="warning" %}
Tags aren't composable!
{% /callout %}

{% /if %}
```
{% /example %}

Tags can be self-closing (similar to HTML). In this example, you'll see that the content body is removed, and that the tag is closed with a `/`.

{% example %}

```
{% image width=40 /%}
```

{% /example %}

If your tag doesn't contain any new lines, then it's treated as an inline tag. Inline tags are automatically wrapped with a single `paragraph` [Node](/docs/nodes) (which renders a `<p>` element by default), to follow the [CommonMark paragraph spec](https://spec.commonmark.org/0.30/#paragraphs).

{% example %}

```
{% code %}

{% highlight %}Inline tag 1{% /highlight %}
{% highlight %}Inline tag 2{% /highlight %}

{% /code %}
```

{% /example %}




## Built-in tags

Markdoc comes out-of-the-box with four built-in tags: `if`, `else`, `table`, and `partial`.

### If/Else

Dynamically render content when specific conditions are met using the `{% if %}` and `{% else /%}` tags. Markdoc uses conditionals with [variables](/docs/syntax#variables) and [functions](/docs/functions).

{% callout type="warning" %}
Unlike JavaScript, Markdoc only considers `undefined`, `null`, and `false` to be falsey.
{% /callout %}

Use the `if` tag to render content when a condition evaluates to `true`.

{% example %}

```
This is shown no matter what.

{% if $myFunVar %}
Only appear if $myFunVar!
{% /if %}
```

{% /example %}

Use the `else` tag to render alternate content when the `if` condition isn't met. You can use multiple `else` statements, and the final `else` tag triggers when none of the other conditions are met.

{% example %}

```
{% if $myFunVar %}
Only appear if $myFunVar!
{% else /%}
This appears if not $myFunVar!
{% /if %}

{% if $myFunVar %}
Only appear if $myFunVar!
{% else $otherFunVar /%}
This appears if not $myFunVar and $otherFunVar!
{% else /%}
This appears if not $myFunVar and not $otherFunVar
{% /if %}
```

{% /example %}

### Table

While Markdoc supports [CommonMark](https://commonmark.org/) tables, it also supports a list based syntax that allows for easy injection of rich content, like bulleted lists and code samples.

#### Basic table

A basic Markdoc table uses list syntax with each row separated by three dashes `---`.

{% example %}

```
{% table %}
* Heading 1
* Heading 2
---
* Row 1 Cell 1
* Row 1 Cell 2
---
* Row 2 Cell 1
* Row 2 cell 2
{% /table %}
```

{% /example %}

#### Table with rich content

Markdoc tables support rich text, including code samples and lists.

{% example %}

````
{% table %}
* Foo
* Bar
* Baz
---
*
  ```
  puts "Some code here."
  ```
*
  {% list type="checkmark" %}
  * Bulleted list in table
  * Second item in bulleted list
  {% /list %}
* Text in a table
---
*
  A "loose" list with

  multiple line items
* Test 2
* Test 3
---
* Test 1
* A cell that spans two columns {% colspan=2 %}
{% /table %}
````

{% /example %}

#### Table without headings

{% example %}

```
{% table %}
---
* foo
* bar
---
* foo
* bar
{% /table %}
```

{% /example %}

#### Set column and row span

Explicitly set column and row span.

{% example %}

```
{% table %}
---
* foo
* bar
---
* foo {% colspan=2 %}
{% /table %}
```

{% /example %}

#### Text alignment

{% example %}

```
{% table %}
* Column 1 {% align="center" %}
* Column 2
* Column 3 {% align="right" %}
---
* foo
* bar
* baz
---
* foo
* bar {% align="right" %}
* baz
---
* foo {% align="center" %}
* bar
* baz
{% /table %}
```

{% /example %}

#### Table caveats

Markdoc uses the `table` tag to locate places to parse the Markdown list syntax as a table, but it uses the `table` [node](/docs/nodes) to render the actual table elements. To customize how the default `table` renders, you need to register a custom a table _node_.

{% example %}

```js
import { nodes } from '@markdoc/markdoc';

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  nodes: {
    table: {
      ...nodes.table,
      render: 'Table' // your custom component goes here
    }
  }
};
```

{% /example %}

### Partial

Markdoc uses partials to reuse content across docs. The content is stored in a separate markdown file, and it's referenced from the `file` attribute in the `partial` tag, which includes the corresponding piece of content.

Here is an example of including the `header.md` file as a partial.
{% example %}

```
{% partial file="header.md" /%}
```

{% /example %}

For more information on partials, check out the full [partials docs](/docs/partials).


## Create a custom tag

To extend Markdoc with a custom tag, first, create a tag definition. In this example, you're creating a `callout` tag:

```js
// ./schema/Callout.markdoc.js

export const callout = {
  render: 'Callout',
  children: ['paragraph', 'tag', 'list'],
  attributes: {
    type: {
      type: String,
      default: 'note',
      matches: ['caution', 'check', 'note', 'warning'],
      errorLevel: 'critical'
    },
    title: {
      type: String
    }
  }
};
```

Then, pass the tag definition to your [`config` object](/docs/config):

```js
import { callout } from './schema/Callout.markdoc';
import * as components from './components';

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  tags: {
    callout
  }
};

const doc = `
# My first custom tag
`;

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, config);

const children = Markdoc.renderers.react(content, React, { components });
```

Next, pass your content to the Markdoc renderer. If you want to render a React component, specify which component should render this type of tag in the `components` mapping.

```jsx
import * as React from 'react';
import { Icon } from './Icon';

function Callout({ title, icon, children }) {
  return (
    <div className="callout">
      <div className="content">
        <Icon icon={icon} />
        <div className="copy">
          <span className="title">{title}</span>
          <span>{children}</span>
        </div>
      </div>
    </div>
  );
}

return Markdoc.renderers.react(content, React, {
  components: {
    // The key here is the same string as `tag` in the previous step
    Callout: Callout
  }
});
```

Now you can use your custom tag in your Markdoc content.

{% sideBySide %}

{% example %}

```md
{% callout title="Hey you!" icon="note" %}
I have a message for you
{% /callout %}
```

{% /example %}

{% callout title="Hey you!" type="note" %}
I have a message for you
{% /callout %}

{% /sideBySide %}

## Options

These are the optional fields you can use to customize your `Tag`:

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
- Specifies which node types can be rendered as children of this tag. Used in schema validation.

---

- `attributes`
- `{ [string]: SchemaAttribute }`
- Specifies which [values (and their types)](/docs/attributes) can be passed to this tag.

---

- `transform`
- ```js
  (Ast.Node, ?Options) =>
    | RenderableTreeNode
    | RenderableTreeNode[]
    | null
  ```
- Customize the Markdoc transform function for this tag, returning the custom output you want to eventually render. This is called during the [`transform` step](/docs/render#transform).

---

- `validate`
- ```js
  (Node, ?Options) => ValidationError[];
  ```
- Extend Markdoc validation. Used to validate that the content meets validation requirements. This is called during the [`validate` step](/docs/render#validate)

---

- `selfClosing`
- `boolean`
- Specifies whether a tag can contain children (`false`) or not (`true`). Used in schema validation.

{% /table %}

## Next steps

- [Customize tags with attributes](/docs/attributes)
- [Create custom functions](/docs/functions)
