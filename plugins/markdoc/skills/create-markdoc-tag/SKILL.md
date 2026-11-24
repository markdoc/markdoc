---
name: create-markdoc-tag
description: Create or update custom Markdoc tags, including their attributes, allowed children, transforms, and HTML or React components. Use when adding a callout, tabs, or another custom content element.
---

# Create a Markdoc tag

Find the application's tag registrations, renderer, and installed Markdoc
version. Reuse a suitable existing tag when possible. Follow its schema module
and component conventions, including those supplied by a framework adapter.

Fetch the hosted [tag](https://markdoc.dev/docs/tags),
[attribute](https://markdoc.dev/docs/attributes), and
[rendering](https://markdoc.dev/docs/render) docs for the schema and component
examples needed by the task. Consult [nodes](https://markdoc.dev/docs/nodes) or
[functions](https://markdoc.dev/docs/functions) when adding an override or custom
function. Check documented APIs against the installed package version.

## Define the content contract

- Choose the source tag name and the rendered element or component. With the
  core React renderer, `render: 'Callout'` requires a `Callout` entry in the
  components map, even when the source uses `{% callout %}`.
- Declare attribute types, defaults, required values, and allowed values in
  the schema. Match rendered attribute names to the component's props; use
  `render: false` for attributes that should remain document data.
- `children` contains AST node types such as `paragraph`, `list`, and `tag`,
  rather than custom tag names or component names.
- Use the default schema transform when it suffices. A custom transform can
  use `node.transformAttributes(config)` and `node.transformChildren(config)`
  to retain declared attributes and transformed children. Return a renderable
  value such as `Markdoc.Tag` and keep the input AST unchanged.
- Add a representative use to the application's content or tag documentation.

## Verify the tag

Validate and render a valid use with the real application config. Check an
invalid attribute or child shape and confirm the expected diagnostic. Exercise
defaults and any custom transform, then run the application's relevant checks.
Include its build when adding a component or changing schema loading.
