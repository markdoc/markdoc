# Next.js example

This is a minimal documentation site using Markdoc and the Next.js App Router.
It installs the published `@markdoc/markdoc` and `@markdoc/next.js` packages from
npm and runs independently of the repository's pnpm workspace.

## Setup

Use Node.js 20.19 or newer. From the Markdoc repository root:

```bash
cd apps/docs/examples/simple-nextjs
npm ci
npm run dev
```

You can also copy this directory into its own repository and run the same npm
commands there. The lockfile pins the example's dependencies; no
`--legacy-peer-deps` option is needed.

Open [http://localhost:3000](http://localhost:3000) and edit `app/page.md`.
The page updates as you edit it. To add a route, create a file such as
`app/docs/getting-started/page.md`.

## Content and metadata

`app/layout.js` supplies the HTML document and shared styles. Each `page.md`
is a native Next.js route, with metadata generated from its frontmatter:

```md
---
title: Get started with Markdoc
description: How to get started with Markdoc
---

# {% $markdoc.frontmatter.title %}
```

Customize `markdoc/config.js`, `markdoc/functions.js`, `markdoc/nodes/index.js`,
and `markdoc/tags/index.js` to extend the schema. All four entry points are
included so the loader can resolve them with Turbopack. See the
[Next.js integration guide](https://markdoc.dev/docs/nextjs) for more options.

## Production

```bash
npm run lint
npm run build
npm run start
```

Development and production builds use Turbopack by default. To build with
Webpack, run `npm run build -- --webpack`.

## Deploy to Vercel

Import `markdoc/markdoc` and set the project's Root Directory to
`apps/docs/examples/simple-nextjs`. The included `vercel.json` uses `npm ci`
and `npm run build` for this standalone example. If you copied the example into
its own repository, use that repository's root instead.

You can also clone just this example through Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmarkdoc%2Fmarkdoc%2Ftree%2Fmain%2Fapps%2Fdocs%2Fexamples%2Fsimple-nextjs)
