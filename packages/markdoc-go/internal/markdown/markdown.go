// Package markdown gives renderers/md the Markdown output mode of package
// markdoc's formatter, which isn't public API.
package markdown

// Format is set by package markdoc. It serializes a Markdown AST, a
// *markdoc.Node or []*markdoc.Node, to CommonMark/GFM.
var Format func(v any) (string, error)
