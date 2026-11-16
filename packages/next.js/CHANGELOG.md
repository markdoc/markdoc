# @markdoc/next.js

## 0.7.0

### Minor Changes

- 9b86bd3: Support native App Router Markdown routes with automatic `app`/`pages` directory discovery for Turbopack and Webpack, including `src` directories and mixed-router projects. The project directory now defaults to the working directory for Turbopack.
  
  Emit configured `nextjs` frontmatter as literal static exports so Next.js can analyze metadata and route settings. Colocated Markdown stays an importable synchronous component. App Router page/layout modules now export only their component and configured Next.js exports; import ordinary Markdown when the `markdoc.frontmatter` export is needed.
  
  Generate App Router metadata from top-level `title` and `description` frontmatter, with optional `nextjs.metadata` overrides. Documents no longer need nested frontmatter for basic page metadata.

### Patch Changes

- bb3b876: Generate TypeScript declarations from the Next.js integration's implementation,
  including types for the loader, runtime helpers, and built-in tags. Add types for
  the existing `nextjsExports` and tokenizer options and allow an omitted Next.js
  configuration when calling the plugin. CommonJS and ESM imports continue to use
  the same package entry points.

## 0.6.2

### Patch Changes

- 7aee867: Publish the Next.js integration from the Markdoc monorepo, with updated repository links and a package containing only its source, README, and license. The package name, entry points, and peer dependency ranges are unchanged.
  
  Avoid excessive work when deriving Turbopack rules from custom extension patterns.
