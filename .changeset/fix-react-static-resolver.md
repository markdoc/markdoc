---
'@markdoc/markdoc': patch
---

Fix `renderers.reactStatic()` throwing from the built package when a bundler renames its tag resolver. Generated React code now binds the resolver explicitly, and custom resolver functions no longer need to be named `tagName`.
