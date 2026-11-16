---
title: Variables
description: Variables let you transform and customize your document at runtime.
---

# {% $markdoc.frontmatter.title %}

Variables let you customize your Markdoc documents at runtime.

{% example %}

```
Here I am rendering a custom {% $variable %}
```

{% /example %}

As server-side data changes, you can present it in real time by re-rendering the page. Each re-render uses the variable's latest value.

(Some templating languages let variables change _during_ rendering, letting you use them in things like for loops. Markdoc doesn't do this, but it does offer [alternative ways](#alternatives) to do the same job.)

## Global variables

You can pass variables in several ways. The simplest is through the `variables` field on your [config](/docs/config) object.


{% example %}

```js
const doc = `
{% if $flags.my_feature_flag %}
Username: {% $user.name %}
{% /if %}
`;

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  variables: {
    flags: {
      my_feature_flag: true
    },
    user: {
      name: 'Dr. Mark'
    }
  }
};

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, config);
```

{% /example %}

## Variables in partials

You can also pass variables to a [partial](/docs/tags#partial). To do this, set the `variables` attribute:

{% example %}

```
{% partial variables={sdk: "Ruby", version: 3} file="header.md" /%}
```

{% /example %}

Access the value within your partial file the same way you would a regular variable:

{% example %}

```
SDK: {% $sdk %}
Version: {% $version %}
```

{% /example %}

## Alternatives

Variables are immutable during page rendering. This keeps rendering behavior consistent and fast. But it means there are some tasks that you should use an alternative for:

* To do calculations without side effects, use [custom or built-in Markdoc functions](/docs/functions).
* To update a value during rendering, use a custom Markdoc transform function. For instance, [run a for loop](/docs/examples#loops) or [accumulate entries for a table of contents](/docs/examples#table-of-contents).



## Caveats

Markdoc doesn't support passing variables to certain [nodes](/docs/nodes), such as the `href` of a `link` Node. Instead, pass your variable to the `href` [attribute](/docs/attributes) of a custom `link` [Tag](/docs/tags).

{% sideBySide %}

{% item %}

#### Incorrect

{% example %}

```
[Link]({% $variable %})
```

{% /example %}

{% /item %}

{% item %}

#### Correct

{% example %}

```
{% link href=$variable %}Link{% /link %}
```

{% /example %}

{% /item %}

{% /sideBySide %}

## Next steps

- [Validate your content](/docs/validation)
- [Render as HTML or React](/docs/render)
