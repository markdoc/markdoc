// Package md renders a tree from markdoc.Transform as CommonMark/GFM
// Markdown.
//
// Transform renders Markdoc's built-in nodes as tags such as p, h1, ul and
// pre, and Render turns those back into Markdown. Other tags, such as the
// ones custom schemas render, become their children unless a Handler,
// keyed by the rendered tag name, converts them.
package md

import (
	"fmt"
	"io"
	"slices"
	"strconv"
	"strings"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/internal/js"
	"markdoc.dev/markdoc/internal/markdown"
)

// A Handler converts a rendered tag to Markdown AST nodes: Markdoc nodes of
// the types Markdown can express, such as "paragraph", "list" or "text".
// Tags, annotations and unresolved variables or functions are errors.
type Handler func(tag *markdoc.Tag, ctx Context) ([]*markdoc.Node, error)

// Context is passed to a Handler.
type Context struct {
	handlers map[string]Handler
}

// RenderChildren converts content, such as a tag's Children, to Markdown AST
// nodes, applying the handlers.
func (c Context) RenderChildren(content any) ([]*markdoc.Node, error) {
	return convert(content, c)
}

var (
	// Children renders a tag as its children.
	Children Handler = func(tag *markdoc.Tag, ctx Context) ([]*markdoc.Node, error) {
		return ctx.RenderChildren(tag.Children)
	}
	// None renders nothing for a tag or its children.
	None Handler = func(*markdoc.Tag, Context) ([]*markdoc.Node, error) { return nil, nil }
)

// Renderer renders trees as Markdown. The zero value converts the tags
// that Transform renders Markdoc's built-in nodes as, rendering other tags
// as their children.
type Renderer struct {
	// Handlers convert tags by rendered name, taking precedence over the
	// built-in conversions.
	Handlers map[string]Handler
}

// Render writes tree as Markdown. It returns an error from a handler, for
// content Markdown can't express, or from w.
func (r Renderer) Render(w io.Writer, tree any) (err error) {
	nodes, err := convert(tree, Context{r.Handlers})
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(renderError)
			if !ok {
				panic(p)
			}
			err = e.error
		}
	}()
	s, err := markdown.Format(node("document", blocks(nodes, true)))
	if err != nil {
		return err
	}
	_, err = io.WriteString(w, s)
	return err
}

// renderError is panicked by normalization and recovered by Render, so
// errors needn't be returned through every call.
type renderError struct{ error }

func fail(format string, args ...any) { panic(renderError{fmt.Errorf(format, args...)}) }

var inlineTypes = map[string]bool{
	"text": true, "strong": true, "em": true, "s": true, "code": true,
	"link": true, "image": true, "hardbreak": true, "softbreak": true,
}

var blockTypes = map[string]bool{
	"paragraph": true, "heading": true, "blockquote": true, "list": true,
	"item": true, "fence": true, "hr": true, "table": true, "thead": true,
	"tbody": true, "tr": true, "th": true, "td": true,
}

// node builds a Markdoc node from alternating attribute keys and values.
func node(typ string, children []*markdoc.Node, kv ...any) *markdoc.Node {
	attributes := markdoc.NewOrderedMap()
	for i := 0; i < len(kv); i += 2 {
		attributes.Set(kv[i].(string), kv[i+1])
	}
	return markdoc.NewNode(typ, attributes, children, "")
}

// str is JS String(v ?? "").
func str(v any) string {
	if js.IsNullish(v) {
		return ""
	}
	return js.ToString(v)
}

// textContent is the literal text of a subtree, used for code where markup
// has no meaning.
func textContent(content any) string {
	switch c := content.(type) {
	case string:
		return c
	case *markdoc.Tag:
		if c == nil {
			return ""
		}
		return textContent(c.Children)
	}
	if f, ok := js.ToNumber(content); ok {
		return js.FormatNumber(f)
	}
	var b strings.Builder
	if items, ok := js.AsArray(content); ok {
		for _, item := range items {
			b.WriteString(textContent(item))
		}
	}
	return b.String()
}

func wrap(typ string, attributes func(a *markdoc.OrderedMap) []any) Handler {
	return func(tag *markdoc.Tag, ctx Context) ([]*markdoc.Node, error) {
		children, err := ctx.RenderChildren(tag.Children)
		if err != nil {
			return nil, err
		}
		var kv []any
		if attributes != nil {
			kv = attributes(tag.Attributes)
		}
		return []*markdoc.Node{node(typ, children, kv...)}, nil
	}
}

func leaf(n func(tag *markdoc.Tag) *markdoc.Node) Handler {
	return func(tag *markdoc.Tag, _ Context) ([]*markdoc.Node, error) {
		return []*markdoc.Node{n(tag)}, nil
	}
}

func list(ordered bool) Handler {
	return wrap("list", func(a *markdoc.OrderedMap) []any {
		if ordered {
			return []any{"ordered", ordered, "start", a.Get("start")}
		}
		return []any{"ordered", ordered}
	})
}

func align(a *markdoc.OrderedMap) []any { return []any{"align", a.Get("align")} }

// builtins convert the tags that Transform renders Markdoc's built-in
// nodes as. They are set in init, since they
// refer back to convert through Context.
var builtins map[string]Handler

func init() {
	builtins = map[string]Handler{
		"article": Children,
		"p":       wrap("paragraph", nil),
		"strong":  wrap("strong", nil),
		"em":      wrap("em", nil),
		"s":       wrap("s", nil),
		"a": wrap("link", func(a *markdoc.OrderedMap) []any {
			return []any{"href", a.Get("href"), "title", a.Get("title")}
		}),
		"img": leaf(func(tag *markdoc.Tag) *markdoc.Node {
			a := tag.Attributes
			return node("image", nil, "src", a.Get("src"), "alt", a.Get("alt"), "title", a.Get("title"))
		}),
		"ul":         list(false),
		"ol":         list(true),
		"li":         wrap("item", nil),
		"blockquote": wrap("blockquote", nil),
		"hr":         leaf(func(*markdoc.Tag) *markdoc.Node { return node("hr", nil) }),
		"br":         leaf(func(*markdoc.Tag) *markdoc.Node { return node("hardbreak", nil) }),
		"code": leaf(func(tag *markdoc.Tag) *markdoc.Node {
			return node("code", nil, "content", textContent(tag.Children))
		}),
		"pre": leaf(func(tag *markdoc.Tag) *markdoc.Node {
			return node("fence", nil, "content", textContent(tag.Children), "language", tag.Attributes.Get("data-language"))
		}),
		"table": wrap("table", nil),
		"thead": wrap("thead", nil),
		"tbody": wrap("tbody", nil),
		"tr":    wrap("tr", nil),
		"th":    wrap("th", align),
		"td":    wrap("td", align),
	}
	for level := 1; level <= 6; level++ {
		builtins["h"+strconv.Itoa(level)] = wrap("heading", func(*markdoc.OrderedMap) []any {
			return []any{"level", level}
		})
	}
}

// convert converts a renderable tree to Markdown AST nodes, without
// normalization.
func convert(content any, ctx Context) ([]*markdoc.Node, error) {
	switch c := content.(type) {
	case string:
		return []*markdoc.Node{node("text", nil, "content", c)}, nil
	case *markdoc.Tag:
		if c == nil {
			return nil, nil
		}
		return convertTag(c, ctx)
	case bool:
		return nil, nil
	}
	if f, ok := js.ToNumber(content); ok {
		return []*markdoc.Node{node("text", nil, "content", js.FormatNumber(f))}, nil
	}
	items, _ := js.AsArray(content)
	var out []*markdoc.Node
	for _, item := range items {
		nodes, err := convert(item, ctx)
		if err != nil {
			return nil, err
		}
		out = append(out, nodes...)
	}
	return out, nil
}

func convertTag(tag *markdoc.Tag, ctx Context) ([]*markdoc.Node, error) {
	handler := ctx.handlers[tag.Name]
	if handler == nil {
		if builtin := builtins[tag.Name]; builtin != nil {
			return builtin(tag, ctx)
		}
		return ctx.RenderChildren(tag.Children)
	}
	nodes, err := handler(tag, ctx)
	if err != nil {
		return nil, err
	}
	if slices.Contains(nodes, nil) {
		return nil, fmt.Errorf("Markdown handler for %q must return Markdoc AST nodes", tag.Name)
	}
	return nodes, nil
}

// Normalization builds a fresh tree in the shape the formatter expects (for
// example, inline content wrapped in `inline` nodes) without mutating the
// converted nodes, which may have been returned by handlers.

func check(n *markdoc.Node) {
	if n == nil {
		fail("Markdown content must be Markdoc AST nodes")
	}
	if n.Type == "tag" {
		fail("Cannot render Markdoc tag %q as Markdown; return Markdown nodes from a handler instead", n.Tag)
	}
	container := n.Type == "document" || n.Type == "inline"
	if !container && !inlineTypes[n.Type] && !blockTypes[n.Type] {
		fail("Cannot render a %q node as Markdown", n.Type)
	}
	if len(n.Annotations) > 0 || n.Slots.Len() > 0 {
		fail("Cannot render Markdoc annotations or slots as Markdown")
	}
	for _, k := range n.Attributes.Keys() {
		switch n.Attributes.Get(k).(type) {
		case *markdoc.Node:
			fail("Cannot render an unresolved Node as Markdown")
		case *markdoc.Variable:
			fail("Cannot render an unresolved Variable as Markdown")
		case *markdoc.Function:
			fail("Cannot render an unresolved Function as Markdown")
		}
	}
}

// flatten expands transparent containers into their children.
func flatten(nodes []*markdoc.Node) []*markdoc.Node {
	var out []*markdoc.Node
	for _, n := range nodes {
		check(n)
		if n.Type == "document" || n.Type == "inline" {
			out = append(out, flatten(n.Children)...)
		} else {
			out = append(out, n)
		}
	}
	return out
}

func isBreak(n *markdoc.Node) bool { return n.Type == "hardbreak" || n.Type == "softbreak" }

func isBlank(n *markdoc.Node) bool {
	return isBreak(n) || n.Type == "text" && js.Trim(js.ToString(n.Attributes.Get("content"))) == ""
}

// trimText trims a text node's content. It is only used on nodes built
// during normalization, never on handler output.
func trimText(n *markdoc.Node, trim func(string, func(rune) bool) string) {
	if n.Type == "text" {
		n.Attributes.Set("content", trim(js.ToString(n.Attributes.Get("content")), js.IsWhitespace))
	}
}

// trim drops whitespace at the edges of a block's inline content, which
// HTML would not show, for example the space left before an annotation.
func trim(nodes []*markdoc.Node) []*markdoc.Node {
	start, end := 0, len(nodes)
	for start < end && isBlank(nodes[start]) {
		start++
	}
	for end > start && isBlank(nodes[end-1]) {
		end--
	}
	result := nodes[start:end]
	if len(result) > 0 {
		trimText(result[0], strings.TrimLeftFunc)
		trimText(result[len(result)-1], strings.TrimRightFunc)
	}
	return result
}

func inlines(nodes []*markdoc.Node) []*markdoc.Node {
	var result []*markdoc.Node
	separate := false

	for _, n := range flatten(nodes) {
		isInline := inlineTypes[n.Type]
		var content []*markdoc.Node
		if isInline {
			content = []*markdoc.Node{inline(n)}
		} else {
			content = blockText(n)
		}
		if len(content) == 0 {
			continue
		}
		// Keep text from separate blocks apart when flattening them,
		// dropping whitespace at the edges of the blocks, which HTML would
		// not show
		if len(result) > 0 && (separate || !isInline) {
			trimText(result[len(result)-1], strings.TrimRightFunc)
			trimText(content[0], strings.TrimLeftFunc)
			result = append(result, node("softbreak", nil))
		}
		result = append(result, content...)
		separate = !isInline
	}

	return result
}

// copyAttributes copies a node's attributes, as {...attributes} does.
func copyAttributes(n *markdoc.Node) []any {
	var kv []any
	for _, k := range n.Attributes.Keys() {
		kv = append(kv, k, n.Attributes.Get(k))
	}
	return kv
}

func inline(n *markdoc.Node) *markdoc.Node {
	a := n.Attributes
	switch n.Type {
	case "text", "code":
		return node(n.Type, nil, "content", str(a.Get("content")))
	case "link", "strong", "em", "s":
		return node(n.Type, inlines(n.Children), copyAttributes(n)...)
	case "image":
		return node("image", nil, copyAttributes(n)...)
	}
	return node(n.Type, nil)
}

// blockText converts block content placed where only inline content is
// valid, such as table cells, keeping its text but not its layout.
func blockText(n *markdoc.Node) []*markdoc.Node {
	switch n.Type {
	case "fence":
		content := strings.TrimSuffix(str(n.Attributes.Get("content")), "\n")
		return []*markdoc.Node{node("code", nil, "content", content)}
	case "hr":
		return nil
	}
	return trim(inlines(n.Children))
}

func blocks(nodes []*markdoc.Node, loose bool) []*markdoc.Node {
	var result, run []*markdoc.Node

	flush := func() {
		content := trim(inlines(run))
		run = nil
		if !slices.ContainsFunc(content, func(n *markdoc.Node) bool { return !isBlank(n) }) {
			return
		}
		wrapped := node("inline", content)
		if loose {
			wrapped = node("paragraph", []*markdoc.Node{wrapped})
		}
		result = append(result, wrapped)
	}

	for _, n := range flatten(nodes) {
		if inlineTypes[n.Type] {
			run = append(run, n)
			continue
		}
		flush()
		for _, b := range block(n) {
			// Adjacent lists with the same marker would merge into one list
			if len(result) > 0 {
				previous := result[len(result)-1]
				ordered := js.Truthy(b.Attributes.Get("ordered"))
				if b.Type == "list" && previous.Type == "list" && js.Truthy(previous.Attributes.Get("ordered")) == ordered {
					marker := previous.Attributes.Get("marker")
					switch {
					case ordered && marker == ")":
						marker = "."
					case ordered:
						marker = ")"
					case marker == "*":
						marker = "-"
					default:
						marker = "*"
					}
					b.Attributes.Set("marker", marker)
				}
			}
			result = append(result, b)
		}
	}
	flush()

	return result
}

// group puts runs of nodes whose types aren't in types into new nodes with
// wrapItems, converting the others with convertItem.
func group(nodes []*markdoc.Node, types []string, convertItem func(*markdoc.Node) *markdoc.Node, wrapItems func([]*markdoc.Node) *markdoc.Node) []*markdoc.Node {
	var result, run []*markdoc.Node
	flush := func() {
		if slices.ContainsFunc(run, func(n *markdoc.Node) bool { return !isBlank(n) }) {
			result = append(result, wrapItems(run))
		}
		run = nil
	}
	for _, n := range flatten(nodes) {
		if slices.Contains(types, n.Type) {
			flush()
			result = append(result, convertItem(n))
		} else {
			run = append(run, n)
		}
	}
	flush()
	return result
}

func cells(nodes []*markdoc.Node) []*markdoc.Node {
	return group(nodes, []string{"th", "td"},
		func(cell *markdoc.Node) *markdoc.Node {
			return node(cell.Type, trim(inlines(cell.Children)), "align", cell.Attributes.Get("align"))
		},
		func(run []*markdoc.Node) *markdoc.Node { return node("td", trim(inlines(run))) })
}

func rows(nodes []*markdoc.Node) []*markdoc.Node {
	return group(nodes, []string{"tr"},
		func(row *markdoc.Node) *markdoc.Node { return node("tr", cells(row.Children)) },
		func(run []*markdoc.Node) *markdoc.Node { return node("tr", cells(run)) })
}

func table(n *markdoc.Node) *markdoc.Node {
	var head, body []*markdoc.Node
	for _, child := range flatten(n.Children) {
		switch child.Type {
		case "thead":
			head = append(head, rows(child.Children)...)
		case "tbody":
			body = append(body, rows(child.Children)...)
		default:
			body = append(body, rows([]*markdoc.Node{child})...)
		}
	}
	return node("table", []*markdoc.Node{node("thead", head), node("tbody", body)})
}

// headingLevel is Math.min(Math.max(Number(level) || 1, 1), 6).
func headingLevel(v any) int {
	f, ok := js.ToNumber(v)
	switch v := v.(type) {
	case string:
		f, ok = 0, true
		if s := js.Trim(v); s != "" {
			var err error
			if f, err = strconv.ParseFloat(s, 64); err != nil {
				ok = false
			}
		}
	case bool:
		ok = v
		f = 1
	}
	if !ok || f != f || f == 0 {
		f = 1
	}
	return int(min(max(f, 1), 6))
}

func block(n *markdoc.Node) []*markdoc.Node {
	a := n.Attributes
	switch n.Type {
	case "paragraph":
		return blocks(n.Children, true)
	case "heading":
		content := trim(inlines(n.Children))
		return []*markdoc.Node{node("heading", []*markdoc.Node{node("inline", content)}, "level", headingLevel(a.Get("level")))}
	case "blockquote":
		return []*markdoc.Node{node("blockquote", blocks(n.Children, true))}
	case "list":
		items := group(n.Children, []string{"item"},
			func(item *markdoc.Node) *markdoc.Node { return node("item", blocks(item.Children, false)) },
			func(run []*markdoc.Node) *markdoc.Node { return node("item", blocks(run, false)) })
		return []*markdoc.Node{node("list", items, "ordered", js.Truthy(a.Get("ordered")), "start", a.Get("start"), "marker", a.Get("marker"))}
	case "fence":
		return []*markdoc.Node{node("fence", nil, "content", str(a.Get("content")), "language", a.Get("language"))}
	case "hr":
		return []*markdoc.Node{node("hr", nil)}
	case "table":
		return []*markdoc.Node{table(n)}
	}
	// Table parts or list items outside their containers
	return blocks(n.Children, true)
}
