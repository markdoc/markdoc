---
name: write-markdoc
description: Write or edit Markdoc documents using an application's tags, variables, conditionals, and partials. Use for content authored in Markdoc, not generic Markdown editing.
---

# Write Markdoc

Find the application's content files and schema, then follow the surrounding
documents' structure and conventions. Read [Authoring](references/authoring.md)
for tag syntax, expressions, partials, literal examples, and frontmatter.

## Use the application's vocabulary

- Check registered tags and their attributes before using them. `callout`,
  `tabs`, and other components from example sites are not built-ins.
- Use Markdoc tags, variables, and configured functions for dynamic content.
  JavaScript expressions and JSX do not replace Markdoc's expression syntax.
- Check which variables and partial names the application supplies. A partial's
  `file` attribute refers to its configured partial mapping.
- Follow the application's frontmatter namespace. Core parsing alone does not
  expose YAML fields as variables.
- Keep Markdoc examples literal with `process=false` on their code fences.

## Verify the content

Validate changed documents with the application's real schema and variables,
then render a representative page or fragment. Check both outcomes of changed
conditionals and any partial arguments. Report schema errors with their source
locations and follow the project's policy for warnings.

Reference: [Syntax documentation](https://markdoc.dev/docs/syntax).
