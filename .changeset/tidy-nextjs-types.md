---
'@markdoc/next.js': patch
---

Generate TypeScript declarations from the Next.js integration's implementation,
including types for the loader, runtime helpers, and built-in tags. Add types for
the existing `nextjsExports` and tokenizer options and allow an omitted Next.js
configuration when calling the plugin. CommonJS and ESM imports continue to use
the same package entry points.
