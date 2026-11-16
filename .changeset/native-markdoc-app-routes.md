---
"@markdoc/next.js": minor
---

Support native App Router Markdown routes with automatic `app`/`pages` directory discovery for Turbopack and Webpack, including `src` directories and mixed-router projects. The project directory now defaults to the working directory for Turbopack.

Emit configured `nextjs` frontmatter as literal static exports so Next.js can analyze metadata and route settings. Colocated Markdown stays an importable synchronous component. App Router page/layout modules now export only their component and configured Next.js exports; import ordinary Markdown when the `markdoc.frontmatter` export is needed.

Generate App Router metadata from top-level `title` and `description` frontmatter, with optional `nextjs.metadata` overrides. Documents no longer need nested frontmatter for basic page metadata.
