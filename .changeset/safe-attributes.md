---
'@markdoc/markdoc': patch
---

Fix a prototype-based attribute validation bypass by treating parsed attributes as own data properties and rejecting reserved attribute names.
