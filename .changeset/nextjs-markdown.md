---
'@markdoc/next.js': major
---

Serve App Router pages as Markdown. Add an empty `app/markdoc/[[...path]]/route.md` and each page is also available at its `.md` URL and, when the `Accept` header prefers Markdown, at its usual URL. Pages export `getMarkdown()`, nodes rendered by components fall back to Markdoc's standard nodes, and `markdown.js` in the schema directory can register handlers for components. Requires `@markdoc/markdoc` 1.0.
