---
'@markdoc/markdoc': patch
---

Fix slow formatting of text that contains a long run of `#` characters. `Markdoc.format` now escapes heading marks in linear time instead of quadratic time, and its output is unchanged.
