# `@markdoc/next.js`

> **Note**: this plugin will be treated as a beta version until `v1.0.0` is released.

Using the `@markdoc/next.js` plugin allows you to create custom `.md` and `.mdoc` pages in your Next.js apps, and automatically render them with [`markdoc`](https://github.com/markdoc/markdoc).

## Setup

The first thing you'll need to do is install `@markdoc/next.js` and add it to your project's config.

1. From your project, run this command to install `@markdoc/next.js`:
   ```sh
   pnpm add @markdoc/next.js @markdoc/markdoc
   ```
2. Open `next.config.js` and add the following code:

   When using Webpack:

   ```js
   // next.config.js

   const withMarkdoc = require('@markdoc/next.js');

   module.exports = withMarkdoc(/* options */)({
     pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdoc'],
   });
   ```

   For [Turbopack support](https://nextjs.org/docs/app/api-reference/turbopack), add the following configuration:

   ```js
   // next.config.js
   module.exports = withMarkdoc({
     schemaPath: './markdoc', // Wherever your Markdoc schema lives
   })({
     pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdoc'],
     turbopack: {}, // Turbopack only runs the loader when a base config exists
   });
   ```

   Turbopack currently requires every schema entry file referenced by `schemaPath` to exist,
   even if you are not customizing them yet. Create `config.js`, `nodes.js`, `tags.js`, and
   `functions.js` in that directory (exporting empty objects is fine) so the loader can resolve
   them during the build.

   The plugin discovers `app/` and `pages/` (or their `src/` equivalents) from
   the project directory. This defaults to the working directory for Turbopack;
   set `dir` if your Next.js project lives elsewhere.

3. Create `app/docs/getting-started/page.md`, using your existing `app/layout.js`.

   ```
   app
   ├── layout.js
   ├── page.md
   └── docs
       └── getting-started
           └── page.md
   ```

4. Add content and metadata to `page.md`:

   ```md
   ---
   title: Get started with Markdoc
   description: How to get started with Markdoc
   ---

   # Get started with Markdoc
   ```

See [our docs](https://markdoc.dev/docs/nextjs) for more options.

## App Router

`page.md` files compile as async Server Components. They participate in
Next.js routing and layouts directly; no JavaScript wrapper is needed. Colocated
Markdown with other filenames remains an importable synchronous component.

The loader turns top-level `title` and `description` frontmatter into a static
Next.js `metadata` export. Other frontmatter fields remain document data. Put
shared metadata defaults and title templates in your usual `layout.js`.

Use `nextjs.metadata` for additional metadata or to override the inferred fields.
Its fields take precedence, including explicit `null` or empty values; an empty
object keeps the inferred defaults. For example, this keeps the document title
and uses a different browser title:

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

The loader also emits `nextjs.revalidate` as a literal route export so Next.js
can statically analyze it. Other static route exports can be enabled with
`nextjsExports`, for example:

```js
withMarkdoc({ nextjsExports: ['metadata', 'revalidate', 'dynamic', 'runtime'] })
```

Excluding `metadata` from `nextjsExports` disables its export, including inferred
metadata. Pages without metadata fields omit the export and inherit layout defaults.

Frontmatter remains available inside the document through `$markdoc.frontmatter`.
Native App Router page/layout modules export only their component and configured
Next.js exports. Ordinary imported Markdown continues to export `markdoc.frontmatter`.

For the Pages Router, use `pages/docs/getting-started.md`. Existing `getStaticProps`
and `getServerSideProps` behavior is unchanged, including projects with both routers.

## Contributing

This package is maintained in [`packages/next.js` in the Markdoc repository](https://github.com/markdoc/markdoc/tree/main/packages/next.js).
Contributions and feedback are welcome. See the [contributing guide](https://github.com/markdoc/markdoc/blob/main/.github/CONTRIBUTING.md).

From the repository root, using the Node version in `.node-version`:

1. Run `pnpm install`
1. Run `pnpm exec turbo run test test:types type:check --filter=@markdoc/next.js`

Turborepo builds the local `@markdoc/markdoc` dependency and this package before
running the tests. Edit the TypeScript files in `src`; the build generates
CommonJS JavaScript and declarations in the ignored `dist` directory, which is
published to npm. The package tests cover the compiled loader and packed-package
imports and types with Next.js 14 and the installed Next.js version.

Use `pnpm changeset` at the repository root to add release notes for `@markdoc/next.js`.

## Code of conduct

This project has adopted the Stripe [Code of conduct](https://github.com/markdoc/markdoc/blob/main/.github/CODE_OF_CONDUCT.md).

## License

This project uses the [MIT license](LICENSE).
