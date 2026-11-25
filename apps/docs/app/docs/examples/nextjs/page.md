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
   pnpm add @markdoc/next.js @markdoc/markdoc
   ```
2. Update your `next.config.js`

   ```js
   const withMarkdoc = require('@markdoc/next.js');

   module.exports = withMarkdoc(/* [options](#options) */)({
     pageExtensions: ['md', 'mdoc', 'js', 'jsx', 'ts', 'tsx'],
     turbopack: {}
   });
   ```

3. Create `app/docs/getting-started/page.md`, using your existing root layout:

   ```
   app
   ├── layout.js
   ├── page.md
   └── docs
       └── getting-started
           └── page.md
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

The plugin compiles `page.md` directly into a Server Component. Next.js owns the
route and applies your layouts normally. Other Markdown files can live alongside
the page and be imported as components without becoming routes.

### Metadata and route settings

Top-level `title` and `description` frontmatter become the page's static
[Next.js metadata export](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).
Other frontmatter fields remain document data. Define shared defaults, title
templates, and social images in `app/layout.js` as usual.

For additional metadata or overrides, use `nextjs.metadata`. Its fields take
precedence over the top-level defaults, including explicit `null` or empty values;
an empty object keeps the defaults. You can also set `nextjs.revalidate` to emit a
static revalidation interval:

```yaml
title: Getting started
description: Set up your first Markdoc page
nextjs:
  metadata:
    title: Get started with Markdoc
    alternates:
      canonical: /docs/getting-started
  revalidate: 3600
```

Here, `$markdoc.frontmatter.title` remains `Getting started`, while Next.js uses
`Get started with Markdoc` as the metadata title. Pages without metadata fields
inherit their layout's defaults.

The plugin discovers `app/` and `pages/`, including `src/app/` and `src/pages/`,
from the project directory. For a Pages Router project, keep using files such as
`pages/docs/getting-started.md`; the data-fetching options below apply to that router.

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
- For the Pages Router, determines whether generated pages use [`getStaticProps`](https://nextjs.org/docs/basic-features/data-fetching/get-static-props) or [`getServerSideProps`](https://nextjs.org/docs/basic-features/data-fetching/get-server-side-props).

---

- `nextjsExports`
- `string[]`
- Static App Router exports to emit. Defaults to `['metadata', 'revalidate']`. Metadata defaults to top-level `title` and `description`, with overrides from `nextjs.metadata`; other exports read from `nextjs` frontmatter. Exclude `metadata` to disable its export, or include other static route settings such as `dynamic` or `runtime` when needed.

{% /table %}

For the Pages Router, set `mode` to `static` to pre-render using `getStaticProps`:

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

## Serving Markdown

App Router pages can also be served as Markdown, which is useful for LLMs and coding agents that read your docs. To turn it on, add an empty route file to your app:

```
app
├── layout.js
├── markdoc
│   └── [[...path]]
│       └── route.md
└── docs
    └── getting-started
        └── page.md
```

The plugin compiles `route.md` into a route handler for all of your pages, so the file stays empty. Restart your dev server after adding it, and every page is also available:

- at its `.md` URL, such as `/docs/getting-started.md`. The home page is `/.md` or `/index.md`.
- at its usual URL, such as `/docs/getting-started`, when the request's `Accept` header prefers Markdown: `text/markdown` is listed before any `text/html`, or `text/plain` is listed first. Browsers keep getting HTML.

Markdown is prerendered when you build, using the [Markdown renderer](/docs/render#markdown). Pages you add during development are served right away. Responses use `Content-Type: text/markdown`, include a `Link` header pointing to the page's canonical URL, and send `Vary: Accept` so caches don't serve Markdown to browsers.

{% callout type="note" %}
Next.js replaces the `Vary` header on prerendered HTML pages, so a shared cache can serve HTML to a client that asks for Markdown with `Accept`. The `.md` URLs always return Markdown.
{% /callout %}

### Components in Markdown

Nodes that you render with your own components, such as a custom `heading` or `fence`, use Markdoc's standard nodes in Markdown. Headings, code blocks, and links stay standard Markdown without extra configuration. Any other component renders only its children.

To convert a component differently, create `markdown.js` in your schema directory and default-export [Markdown handlers](/docs/render#custom-handlers). Handlers are keyed by the PascalCase name of the tag or node, the same names you use to override components:

```js
// markdoc/markdown.js
import { Ast } from '@markdoc/markdoc';

export default {
  Callout: (tag, { renderChildren }) =>
    new Ast.Node('blockquote', {}, renderChildren(tag.children)),
  Tabs: 'children',
  Playground: 'none'
};
```

A handler registered for a node's component replaces the standard node.

Each App Router page also exports an async `getMarkdown()` function that returns the page as Markdown, if you'd rather serve it yourself. Pages Router pages and pages with dynamic segments, such as `app/blog/[slug]/page.md`, aren't served as Markdown.

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
