package html_test

// A port of packages/markdoc/src/renderers/html.test.ts.

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/internal/fixtures"
	"markdoc.dev/markdoc/internal/rendertest"
	"markdoc.dev/markdoc/renderers/html"
)

func attrs(kv ...any) *markdoc.OrderedMap {
	m := markdoc.NewOrderedMap()
	for i := 0; i < len(kv); i += 2 {
		m.Set(kv[i].(string), kv[i+1])
	}
	return m
}

func transform(t *testing.T, n *markdoc.Node, c *markdoc.Config) any {
	t.Helper()
	out, err := markdoc.Transform(n, c)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func render(t *testing.T, tree any) string {
	t.Helper()
	var b strings.Builder
	if err := (html.Renderer{}).Render(&b, tree); err != nil {
		t.Fatal(err)
	}
	return b.String()
}

func TestRender(t *testing.T) {
	tag := func(name string, a *markdoc.OrderedMap, children ...any) *markdoc.Tag {
		return markdoc.NewTag(name, a, children)
	}
	cases := []struct {
		name string
		tree any
		want string
	}{
		{"rendering a tag", tag("h1", nil, "test"), "<h1>test</h1>"},
		{"rendering string child nodes", tag("h1", nil, "test ", "1"), "<h1>test 1</h1>"},
		{"rendering nested tags", tag("div", nil, tag("p", nil, "test")), "<div><p>test</p></div>"},
		{"rendering parallel tags", []any{tag("p", nil, "foo"), tag("p", nil, "bar")}, "<p>foo</p><p>bar</p>"},
		{"rendering a tag with an invalid child", tag("div", nil, "test", attrs("foo", "bar")), "<div>test</div>"},
		{"rendering a void element", tag("hr", nil), "<hr>"},
		{"rendering a tag with numeric children", tag("p", attrs(), 1.0), "<p>1</p>"},
		{"lowercase attributes", tag("td", attrs("colSpan", 2.0, "rowSpan", 3.0), "Data"), `<td colspan="2" rowspan="3">Data</td>`},
		{"with basic value", tag("foo", attrs("bar", "baz")), `<foo bar="baz"></foo>`},
		{"with an id attribute", tag("h1", attrs("id", "foo", "test", "bar"), "test"), `<h1 id="foo" test="bar">test</h1>`},
		{"with a number attribute value", tag("h1", attrs("data-foo", 42.0), "test"), `<h1 data-foo="42">test</h1>`},
		{"with null and undefined attribute values", tag("p", attrs("a", nil, "b", markdoc.Undefined, "c", false), "test"), `<p c="false">test</p>`},
		{"with an invalid attribute name", tag("p", attrs("a>b", 1.0, "x y", 2.0, "a=b", 3.0, "ok", 4.0), "test"), `<p ok="4">test</p>`},
		{"with a custom element name", tag("my-element", nil, "test"), "<my-element>test</my-element>"},
		{"with an invalid nested tag name", tag("div", nil, tag("p>x", nil, "test")), "<div>test</div>"},
		{"escaping", tag("p", attrs("title", `<"&'>`), `<"&'>`), `<p title="&lt;&quot;&amp;'&gt;">&lt;&quot;&amp;'&gt;</p>`},
		{"nil children", &markdoc.Tag{Name: "p"}, "<p></p>"},
		{"Go numbers", []any{1, int64(2), float32(0.5)}, "120.5"},
	}
	for _, c := range cases {
		if got := render(t, c.tree); got != c.want {
			t.Errorf("%s: got %q, want %q", c.name, got, c.want)
		}
	}

	for _, name := range []string{"h1>x", "a b", "1a", "a/b"} {
		if got := render(t, tag(name, attrs("id", "foo"), "test")); got != "test" {
			t.Errorf("with an invalid tag name %q: got %q", name, got)
		}
	}

	tree := transform(t, markdoc.Parse(`# Heading {% level="1>x" %}`), nil)
	if got := render(t, tree); got != "<article><h1>Heading </h1></article>" {
		t.Errorf("rendering a heading with an invalid level annotation: got %q", got)
	}
}

// tag.test.ts

func TestFixtures(t *testing.T) {
	rendertest.Run(t, func(f fixtures.Fixture) json.RawMessage { return f.HTML }, html.Renderer{}.Render)
}

func TestHandlers(t *testing.T) {
	config := &markdoc.Config{Tags: map[string]*markdoc.Schema{
		"callout": {Render: "Callout"},
		"layout":  {Render: "Layout"},
		"button":  {Render: "CopyButton", SelfClosing: true},
		"icon":    {Render: "Icon", SelfClosing: true},
	}}
	tree := transform(t, markdoc.Parse("{% layout %}\n{% callout %}\nNote {% icon /%}\n{% /callout %}\n{% button /%}\n{% /layout %}"), config)
	before, _ := json.Marshal(tree)

	r := html.Renderer{Handlers: map[string]html.Handler{
		"Callout": func(tag *markdoc.Tag, ctx html.Context) (any, error) {
			children, err := ctx.RenderChildren(tag.Children)
			return markdoc.NewTag("div", attrs("class", "callout"), []any{children}), err
		},
		"Icon": func(*markdoc.Tag, html.Context) (any, error) {
			return markdoc.NewTag("svg", attrs("aria-hidden", "true"), nil), nil
		},
		"Layout":     html.Children,
		"CopyButton": html.None,
	}}
	var b strings.Builder
	if err := r.Render(&b, tree); err != nil {
		t.Fatal(err)
	}
	if want := `<article><div class="callout"><p>Note <svg aria-hidden="true"></svg></p></div></article>`; b.String() != want {
		t.Errorf("renders custom components:\n  got:  %q\n  want: %q", b.String(), want)
	}
	if after, _ := json.Marshal(tree); string(after) != string(before) {
		t.Errorf("mutated the input tree:\n  before: %s\n  after:  %s", before, after)
	}

	// What a handler returns is written as it is, so a handler can render
	// an element of its own name.
	b.Reset()
	same := html.Renderer{Handlers: map[string]html.Handler{
		"p": func(tag *markdoc.Tag, _ html.Context) (any, error) {
			return markdoc.NewTag("p", attrs("class", "x"), tag.Children), nil
		},
	}}
	if err := same.Render(&b, markdoc.NewTag("p", nil, []any{"a"})); err != nil {
		t.Fatal(err)
	}
	if want := `<p class="x">a</p>`; b.String() != want {
		t.Errorf("handler output: got %q, want %q", b.String(), want)
	}

	failing := html.Renderer{Handlers: map[string]html.Handler{
		"Outer":  html.Children,
		"Broken": func(*markdoc.Tag, html.Context) (any, error) { return nil, errors.New("handler failed") },
	}}
	nested := markdoc.NewTag("Outer", nil, []any{markdoc.NewTag("Broken", nil, nil)})
	if err := failing.Render(&b, nested); err == nil || err.Error() != "handler failed" {
		t.Errorf("propagates handler errors: %v", err)
	}
}
