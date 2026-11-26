// Package html renders a tree from markdoc.Transform as HTML.
//
// Tags become elements of the same name, so a schema's Render names the
// element. A Handler, keyed by the rendered tag name, can render a tag as
// other content instead, such as a component's markup.
package html

import (
	"io"
	"strings"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/internal/js"
)

// voidElements have no closing tag, as defined in the HTML standard:
// https://html.spec.whatwg.org/#void-elements
var voidElements = map[string]bool{
	"area": true, "base": true, "br": true, "col": true, "embed": true,
	"hr": true, "img": true, "input": true, "link": true, "meta": true,
	"param": true, "source": true, "track": true, "wbr": true,
}

// escapeHTML escapes text as markdown-it's escapeHtml does.
var escapeHTML = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;").Replace

// isTagName checks a tag name against /^[a-zA-Z][^\s/>\0]*$/. Names are
// written into the markup verbatim, so anything that would end the tag
// early is rejected. Based on the HTML tokenizer's tag name state:
// https://html.spec.whatwg.org/#tokenization
func isTagName(s string) bool {
	if s == "" || !js.IsASCIILetter(s[0]) {
		return false
	}
	return !strings.ContainsFunc(s, func(r rune) bool {
		return js.IsWhitespace(r) || r == '/' || r == '>' || r == 0
	})
}

// isAttributeName checks an attribute name against /^[^\s"'>/=\0]+$/.
func isAttributeName(s string) bool {
	return s != "" && !strings.ContainsFunc(s, func(r rune) bool {
		return js.IsWhitespace(r) || strings.ContainsRune(`"'>/=`, r) || r == 0
	})
}

// A Handler renders a tag as other content: a tree of *markdoc.Tag values
// and scalars, which is written as it is returned. Children it includes
// should come from ctx.RenderChildren so that handlers apply to them too.
type Handler func(tag *markdoc.Tag, ctx Context) (any, error)

// Context is passed to a Handler.
type Context struct {
	handlers map[string]Handler
}

// RenderChildren returns content, such as a tag's Children, with the
// handlers applied.
func (c Context) RenderChildren(content any) (any, error) {
	return c.resolve(content)
}

var (
	// Children renders a tag as its children.
	Children Handler = func(tag *markdoc.Tag, ctx Context) (any, error) {
		return ctx.RenderChildren(tag.Children)
	}
	// None renders nothing for a tag or its children.
	None Handler = func(*markdoc.Tag, Context) (any, error) { return nil, nil }
)

// Renderer renders trees as HTML. The zero value renders every tag as an
// element.
type Renderer struct {
	// Handlers render tags by rendered name.
	Handlers map[string]Handler
}

// Render writes tree as HTML. Strings and numbers are escaped, *markdoc.Tag
// values become elements, and other values render nothing. It returns an
// error from a handler or from w.
func (r Renderer) Render(w io.Writer, tree any) error {
	if len(r.Handlers) > 0 {
		var err error
		if tree, err = (Context{r.Handlers}).resolve(tree); err != nil {
			return err
		}
	}
	out := &renderer{w: w}
	out.render(tree)
	return out.err
}

// resolve applies the handlers to a tree, copying the tags it changes.
func (c Context) resolve(content any) (any, error) {
	switch v := content.(type) {
	case *markdoc.Tag:
		if v == nil {
			return v, nil
		}
		if handler := c.handlers[v.Name]; handler != nil {
			return handler(v, c)
		}
		children, err := c.resolve(v.Children)
		if err != nil {
			return nil, err
		}
		items, _ := children.([]any)
		return &markdoc.Tag{Name: v.Name, Attributes: v.Attributes, Children: items}, nil
	case string:
		return v, nil
	}
	items, ok := js.AsArray(content)
	if !ok {
		return content, nil
	}
	out := make([]any, len(items))
	for i, item := range items {
		var err error
		if out[i], err = c.resolve(item); err != nil {
			return nil, err
		}
	}
	return out, nil
}

type renderer struct {
	w   io.Writer
	err error
}

func (r *renderer) write(s string) {
	if r.err == nil {
		_, r.err = io.WriteString(r.w, s)
	}
}

func (r *renderer) render(node any) {
	switch n := node.(type) {
	case string:
		r.write(escapeHTML(n))
		return
	case *markdoc.Tag:
		if n != nil {
			r.renderTag(n)
		}
		return
	case nil, bool, js.Undefined:
		return
	}
	if f, ok := js.ToNumber(node); ok {
		r.write(escapeHTML(js.FormatNumber(f)))
		return
	}
	if items, ok := js.AsArray(node); ok {
		for _, item := range items {
			r.render(item)
		}
	}
}

func (r *renderer) renderTag(t *markdoc.Tag) {
	if !isTagName(t.Name) {
		r.render(t.Children)
		return
	}

	r.write("<" + t.Name)
	for _, k := range t.Attributes.Keys() {
		if v := t.Attributes.Get(k); !js.IsNullish(v) && isAttributeName(k) {
			r.write(" " + strings.ToLower(k) + `="` + escapeHTML(js.ToString(v)) + `"`)
		}
	}
	r.write(">")

	if voidElements[t.Name] {
		return
	}

	r.render(t.Children)
	r.write("</" + t.Name + ">")
}
