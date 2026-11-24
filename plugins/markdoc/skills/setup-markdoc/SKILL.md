---
name: setup-markdoc
description: Install or integrate @markdoc/markdoc into an application, including parsing, validation, transformation, and HTML or React rendering.
---

# Set up Markdoc

Find the application's installed Markdoc version, content source, framework,
and rendering entry point. Follow its package manager, module format, and
dependency policy. Extend an existing integration when present; preserve the
framework and router unless the task calls for changing them.

Fetch the relevant hosted docs for the task: [getting started](https://markdoc.dev/docs/getting-started)
for installation and imports, [configuration](https://markdoc.dev/docs/config)
for application data, [rendering](https://markdoc.dev/docs/render) for HTML or
React output, and [validation](https://markdoc.dev/docs/validation) for diagnostics.
Check documented APIs against the installed package version. For a framework
adapter, follow its installed API and existing loading convention.

## Connect the content pipeline

- Parse source into an AST, validate with the application's config, transform
  with that config, then render the transformed tree.
- TypeScript consumers need `@types/react` for the public declarations, even
  with HTML output. The React runtime is needed only for React rendering.
- Supply variables through `config.variables` and parsed partial ASTs through
  `config.partials`. Avoid substituting values into source strings.
- Core parsing retains frontmatter as text. Use the application's parser
  and namespace to expose those fields to content.
- Parse static content once where the application lifecycle permits, then
  transform with the values needed for each render. Keep reusable ASTs unchanged.
- Rendered values can reach the browser. Pass the data the document needs
  rather than an entire server environment or request object.

## Verify the integration

Validate and render a representative document with the real config, including
any variables or partials used by the application. Check how diagnostics reach
the author. Run the application's build when changing content loading or rendering.
