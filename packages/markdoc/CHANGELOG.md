# @markdoc/markdoc

## 0.5.14

### Patch Changes

- cfe43ee: Harden heading level handling and HTML tag and attribute name serialization in the HTML renderer. The HTML renderer also omits `null` and `undefined` attribute values.

## 0.5.13

### Patch Changes

- 11024d5: Fix a prototype-based attribute validation bypass by treating parsed attributes as own data properties and rejecting reserved attribute names. Resolve serialized Markdoc function and variable values in attributes.
