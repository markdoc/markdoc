# @markdoc/next.js

## 0.8.0

### Minor Changes

- a443d4c: Keep the capitals of camelCase tag and node names when naming their components, so `sideBySide` renders as `SideBySide` instead of `Sidebyside`. Names that differ only in case, such as `sideBySide` and `sidebyside`, no longer share a component. If your code matches rendered tag names, for example in a custom renderer or by inspecting `markdoc.content`, update camelCase names to the new form.

### Patch Changes

- f51c920: Update the minimum js-yaml dependency to 4.3.2.
- Updated dependencies [89aa830]
- Updated dependencies [24ddafb]
- Updated dependencies [b5cc112]
- Updated dependencies [635fb76]
- Updated dependencies [0c1fe30]
- Updated dependencies [8a27c52]
- Updated dependencies [9a9826c]
  - @markdoc/markdoc@0.6.0

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
