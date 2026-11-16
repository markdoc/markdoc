---
title: Using Markdoc with Next.js
description: Learn how to integrate Markdoc into a Next.js project.
---

# {% $markdoc.frontmatter.title %}

Using the `@markdoc/next.js` package/plugin allows you to create custom `.md` and `.mdoc` pages in your Next.js apps, and automatically render them with Markdoc.

To get started right away, check out [this starter repo](https://github.com/markdoc/markdoc-starter). The quickest way to deploy your own version of the starter is by deploying it with [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/) by clicking one of the buttons below.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/markdoc/markdoc-starter) [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/markdoc/markdoc-starter)

## Setup

This guide assumes that you already have Next.js installed. If you're starting from scratch, follow these steps for [getting started with Next.js](https://nextjs.org/docs).

\
Follow these steps to get started with `@markdoc/next.js`.

1. Install `@markdoc/next.js` and `@markdoc/markdoc`:
   ```shell
   npm install @markdoc/next.js @markdoc/markdoc
   ```
2. Update your `next.config.js`

   ```js
   const withMarkdoc = require('@markdoc/next.js');

   module.exports = withMarkdoc(/* [options](#options) */)({
     pageExtensions: ['md', 'mdoc', 'js', 'jsx', 'ts', 'tsx']
   });
   ```

3. Create a new `.md` file in within `/pages/`, such as `getting-started.md`

   ```
   pages
   ├── _app.js
   ├── docs
   │   └── getting-started.md
   └── index.md
   ```

4. Add some Markdoc to your file:

   ```
   ---
   title: Get started with Markdoc
   description: How to get started with Markdoc
   ---

   # Get started with Markdoc
   ```

\
Or, clone [this starter repo](https://github.com/markdoc/markdoc-starter) and follow the directions in the [README](https://github.com/markdoc/markdoc-starter/blob/main/README.md).

## Options

You can pass options to `withMarkdoc` to adjust how the plugin behaves.

{% table %}

- Option
- Type
- Description

---

- `schemaPath`
- `string`
- Path to your Markdoc schema folder. See [schema customization](#schema-customization).

---

- `mode`
- `'static' | 'server'`
- Determines whether the generated Markdoc pages use [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching/get-static-props) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props).

{% /table %}

For example, this is how you set the `mode` to `static` to pre-render the page at build time using the props returned by `getStaticProps`:

```js
module.exports = withMarkdoc({ mode: 'static' })({
  pageExtensions: // [...](https://nextjs.org/docs/api-reference/next.config.js/custom-page-extensions)
});
```

## Schema customization

You can define your Markdoc schema by creating a `/markdoc/` directory at the root of your project. This is where custom [nodes](/docs/nodes), [tags](/docs/tags), and [functions](/docs/functions) are defined.

```
.
├── components
│   ├── ...
│   └── Link.js
├── markdoc
│   ├── functions.js
│   ├── nodes
│   │   ├── ...
│   │   ├── link.markdoc.js
│   │   └── index.js
│   └── tags
│       ├── ...
│       └── index.js
├── pages
│   ├── _app.js
│   └── index.md
└── next.config.js

```

You can choose the import location for your schema by passing the `schemaPath` option to `withMarkdoc`:

```js
module.exports = withMarkdoc({ schemaPath: './path/to/your/markdoc/schema' })({
  pageExtensions: // [...](https://nextjs.org/docs/api-reference/next.config.js/custom-page-extensions)
});
```

### Tags

You register custom tags by exporting an object from `/markdoc/tags.js` (or `/markdoc/tags/index.js`). In this example, the tag name is `button`. The `render` field tells Markdoc to render a `Button` React component whenever the `{% button %}` tag is used.

```js
// markdoc/tags.js

import { Button } from '../components/Button';

export const button = {
  render: Button,
  attributes: {
    href: {
      type: String
    }
  }
};
```

If you want to use kebab case for your tag names, you can export an object like:

```js
// markdoc/tags.js

export default {
  'special-button': {
    render: SpecialButton,
    attributes: {
      href: {
        type: String
      }
    }
  }
};
```

### Nodes

Custom node registrations are almost identical to [tags](#tags), except you create a `/markdoc/nodes.js` file instead, for example:

```js
// markdoc/nodes.js

import { Link } from 'next/link';

export const link = {
  render: Link,
  attributes: {
    href: {
      type: String
    }
  }
};
```

This example overrides the default `link` [node](/docs/nodes).

### Functions

Custom functions registrations are almost identical to tags and nodes, except you create a `/markdoc/functions.js` file instead, for example:

```js
// markdoc/functions.js

export const upper = {
  transform(parameters) {
    const string = parameters[0];

    return typeof string === 'string' ? string.toUpperCase() : string;
  }
};
```

### Advanced

If you want more control over your config object, or you are using the [Markdoc language server for Visual Studio Code](https://github.com/markdoc/language-server), you can create a `/markdoc/config.js` file and export the full config object. This allows you to extend your config with more data, like records or utility functions.

```js
// markdoc/config.js

import tags from './tags';
import nodes from './nodes';
import functions from './functions';

export default {
  tags,
  nodes,
  functions
  // add other stuff here
};
```

## Frontmatter

Markdoc is frontmatter agnostic, however, `@markdoc/next.js` uses YAML as its frontmatter language. You can access the frontmatter object within your `_app.js` under `pageProps.markdoc.frontmatter`, or in your content using the `$markdoc.frontmatter` variable.

For example:

{% example %}

```md
---
title: Using the Next.js plugin
description: Integrate Markdoc into your Next.js app
---

# {% $markdoc.frontmatter.title %}
```

{% /example %}

## Partials

Partials automatically load from the `/markdoc/partials/` directory. For example:

{% example %}

```
{% partial file="header.md" /%}
```

{% /example %}

would load and render the contents of `markdoc/partials/header.md`

## Layouts

To create a custom layout for each of your Markdown/Markdoc files, wrap your `Component` within your `_app.js`, for example:

```js
// pages/_app.js

import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <Layout frontmatter={pageProps.markdoc.frontmatter}>
      <Component {...pageProps} />
    </Layout>
  );
}
```

## Comments

You can add comments to your Next.js content by passing `allowComments` to the Markdoc tokenizer:

```js
const withMarkdoc = require('@markdoc/next.js');

withMarkdoc({ tokenizerOptions: { allowComments: true } });
```

and then using comment syntax:

{% example %}

```md
<!-- Your comment here -->
```

{% /example %}

## Built-in Next.js tags

Next.js Markdoc provides custom tags out-of-the-box that you can add to your schema. To include them, export them by name in your schema directory (for example, `/markdoc/`). For example:

```js
// markdoc/tags/Next.markdoc.js

export { comment, head, link, script } from '@markdoc/next.js/tags';

// or

export * from '@markdoc/next.js/tags';
```

### Head

Renders a [Next.js `Head` component](https://nextjs.org/docs/api-reference/next/head). You can use this to add stuff to the `<head>` of your page.

{% callout type="warning" %}
You need to create and register your own tags for `meta`, `title`, and so on.
{% /callout %}

{% example %}

```md
{% head %}

Add custom `title` and `meta` tags here…

{% /head %}
```

{% /example %}

### Link

Renders a [Next.js `Link` component](https://nextjs.org/docs/api-reference/next/link). Requires passing an `href` attribute.

{% example %}

```md
{% link href="/docs/getting-started" %}
Getting started
{% /link %}
```

{% /example %}

### Script

Renders a [Next.js `Script` component](https://nextjs.org/docs/api-reference/next/script). Requires passing a `src` attribute.

{% example %}

```md
{% script src="https://js.stripe.com/v3" /%}
```

{% /example %}
