---
'@markdoc/next.js': minor
---

Keep the capitals of camelCase tag and node names when naming their components, so `sideBySide` renders as `SideBySide` instead of `Sidebyside`. Names that differ only in case, such as `sideBySide` and `sidebyside`, no longer share a component. If your code matches rendered tag names, for example in a custom renderer or by inspecting `markdoc.content`, update camelCase names to the new form.
