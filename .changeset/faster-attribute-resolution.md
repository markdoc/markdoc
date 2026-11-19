---
'@markdoc/markdoc': patch
---

Reduce overhead when resolving and transforming documents by copying attribute values more efficiently and skipping unnecessary work for empty slots. Preserve independent node copies, constructor defaults, and protection against inherited property setters.
