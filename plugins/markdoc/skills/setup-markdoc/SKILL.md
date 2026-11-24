---
name: setup-markdoc
description: Install or integrate @markdoc/markdoc into an application, including parsing, validation, transformation, and HTML or React rendering.
---

# Set up Markdoc

Find the application's installed Markdoc version, content source, framework,
and rendering entry point. Follow its package manager, module format, and
dependency policy. Extend an existing integration when present; preserve the
framework and router unless the task calls for changing them.

Read [Rendering pipeline](references/rendering.md) for core setup examples,
dependencies, and validation behavior. When the application uses a framework
adapter, follow that adapter's installed API and existing loading convention.
Repository main can contain unpublished features.

## Connect the content pipeline

- Parse source into an AST, validate with the application's config, transform
  with that config, then render the transformed tree.
- Supply variables through `config.variables` and parsed partial ASTs through
  `config.partials`. Avoid substituting values into source strings.
- Core parsing retains frontmatter as YAML text. Use the application's parser
  and namespace to expose those fields to content.
- Parse static content once where the application lifecycle permits, then
  transform with the values needed for each render. Keep reusable ASTs unchanged.
- Rendered values can reach the browser. Pass the data the document needs
  rather than an entire server environment or request object.

## Verify the integration

Validate and render a representative document with the real config, including
any variables or partials used by the application. Check how diagnostics reach
the author. Run the application's build when changing content loading or rendering.

Reference: [Rendering documentation](https://markdoc.dev/docs/render).
