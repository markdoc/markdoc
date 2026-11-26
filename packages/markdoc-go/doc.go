// Package markdoc is a Go implementation of Markdoc, a Markdown-based
// authoring format. Its results match the JavaScript implementation,
// @markdoc/markdoc, byte for byte.
//
// Parse returns a document Node. Syntax errors do not stop parsing; they are
// recorded on the nodes involved. Validate checks an AST against the schemas
// in a Config, and Transform turns it into a tree of *Tag values and
// scalars, which the packages under renderers render, such as
// markdoc.dev/markdoc/renderers/html. Format prints an AST as Markdoc
// source.
//
// JS values map to Go as follows: objects are *OrderedMap, which keeps JS
// key order; numbers are float64; arrays are []any; null is nil; and
// undefined is Undefined. Encoding a Node or Tag with encoding/json
// produces the same JSON as JSON.stringify in JS, and FromJSON reads it
// back. Use an encoder with SetEscapeHTML(false) to match it byte for byte.
package markdoc
