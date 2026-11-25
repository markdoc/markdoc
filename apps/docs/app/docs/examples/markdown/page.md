---
title: Using Markdoc with Markdown
---

# {% $markdoc.frontmatter.title %}

Markdoc can render your content as Markdown as well as HTML or React. Serving Markdown makes your docs easier for LLMs and coding agents to read, because they get the text and structure of a page without its markup, scripts, and styles.

{% agents %}
You're reading the Markdown version of this page. The site shows a different note in this spot, written with the tags described in [Content for agents and humans](#content-for-agents-and-humans).
{% /agents %}

{% humans %}
{% callout type="note" %}
Agents reading the [Markdown version of this page](/docs/examples/markdown.md) see a different note here, written with the tags described in [Content for agents and humans](#content-for-agents-and-humans).
{% /callout %}
{% /humans %}

## Next.js

If you use [`@markdoc/next.js`](/docs/examples/nextjs), serving Markdown works out of the box. Add an empty route file to your app, and every App Router page is also available as Markdown:

```
app
├── markdoc
│   └── [[...path]]
│       └── route.md
└── docs
    └── getting-started
        └── page.md
```

- `/docs/getting-started.md` always returns Markdown.
- `/docs/getting-started` returns Markdown when the request's `Accept` header prefers `text/markdown`, and HTML to browsers.

Headings, code blocks, links, and the other standard nodes stay standard Markdown, even when you render them with your own components. Custom tags render their children. To convert a component differently, add a `markdown.js` file to your schema directory. See [Serving Markdown](/docs/examples/nextjs#serving-markdown) for the details.

This site is built this way. Add `.md` to the URL of any page to see its Markdown, for example [`/docs/getting-started.md`](/docs/getting-started.md).

## Other frameworks

Outside Next.js, call `Markdoc.renderers.md` with the same renderable tree you pass to the HTML or React renderer:

```js
const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, config);

const html = Markdoc.renderers.html(content);
const markdown = Markdoc.renderers.md(content);
```

Then serve `markdown` with `Content-Type: text/markdown` from whatever route you choose. See the [Markdown renderer](/docs/render#markdown) for how to convert your custom components with handlers.

## Content for agents and humans

Sometimes a page should say something different to an agent than to a person. An interactive widget means nothing in Markdown, but an agent might need a short description of what it does, or a pointer to an API it can call instead. Instructions such as "Click **Copy**" make sense only on the site.

Because each renderer decides how to render a tag, you can create tags whose content appears in only one output. This site uses two:

```markdoc {% process=false %}
{% humans %}
Click **Copy** to copy the snippet.
{% /humans %}

{% agents %}
The snippet is also available as plain text at /snippets/install.txt.
{% /agents %}
```

On the site, the `humans` component renders its children and the `agents` component renders nothing:

```js
// components/Audience.js

export function Humans({ children }) {
  return children;
}

export function Agents() {
  return null;
}
```

Keep these as server components, without `'use client'`. React sends the props of client components to the browser, so a client `Agents` component would include its content in the page even though it renders nothing. Either way, treat audience-specific content as presentation, not access control.

```js
// markdoc/tags.js

import { Agents, Humans } from '../components/Audience';

export const humans = {
  render: Humans
};

export const agents = {
  render: Agents
};
```

In Markdown, `markdown.js` does the reverse. Markdown handlers are keyed by component name, so `'none'` drops the `Humans` content and `'children'` keeps the `Agents` content:

```js
// markdoc/markdown.js

export default {
  Agents: 'children',
  Humans: 'none'
};
```

Outside Next.js, pass the same components to the React renderer and the same handlers to the Markdown renderer:

```js
const config = {
  tags: {
    humans: { render: 'Humans' },
    agents: { render: 'Agents' }
  }
};

const content = Markdoc.transform(ast, config);

const page = Markdoc.renderers.react(content, React, {
  components: { Agents, Humans }
});

const markdown = Markdoc.renderers.md(content, {
  handlers: { Agents: 'children', Humans: 'none' }
});
```

The same approach works for any audience-specific content, such as a tag that renders only in Markdown with extra context about an API, or one that hides a long changelog from agents.
