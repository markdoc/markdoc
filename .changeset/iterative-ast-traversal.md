---
'@markdoc/markdoc': patch
---

Use iterative AST traversal to reduce parsing and validation overhead and avoid recursive walker stack overflows on deeply nested trees. Preserve traversal order, mutation behavior, custom node walkers, and independent validation parent arrays.
