package md_test

// Where these tests check the CommonMark meaning of the output, they
// re-parse it with goldmark.

import (
	"bytes"
	"encoding/json"
	"html"
	"strings"
	"testing"

	"github.com/yuin/goldmark"
	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/text"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/internal/fixtures"
	"markdoc.dev/markdoc/internal/rendertest"
	htmlrenderer "markdoc.dev/markdoc/renderers/html"
	"markdoc.dev/markdoc/renderers/md"
)

func tag(name string, attributes map[string]any, children ...any) *markdoc.Tag {
	a := markdoc.NewOrderedMap()
	for k, v := range attributes {
		a.Set(k, v)
	}
	return markdoc.NewTag(name, a, children)
}

func newNode(typ string, children []*markdoc.Node, kv ...any) *markdoc.Node {
	a := markdoc.NewOrderedMap()
	for i := 0; i < len(kv); i += 2 {
		a.Set(kv[i].(string), kv[i+1])
	}
	return markdoc.NewNode(typ, a, children, "")
}

func transform(t *testing.T, source string, config *markdoc.Config) any {
	t.Helper()
	tree, err := markdoc.Transform(markdoc.Parse(source), config)
	if err != nil {
		t.Fatal(err)
	}
	return tree
}

// renderErr renders with r, or the default Renderer if r is nil.
func renderErr(tree any, r *md.Renderer) (string, error) {
	if r == nil {
		r = &md.Renderer{}
	}
	var b strings.Builder
	err := r.Render(&b, tree)
	return b.String(), err
}

func render(t *testing.T, tree any, r *md.Renderer) string {
	t.Helper()
	s, err := renderErr(tree, r)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func markdown(t *testing.T, source string, config *markdoc.Config) string {
	t.Helper()
	return render(t, transform(t, source, config), nil)
}

func renderHTML(t *testing.T, tree any) string {
	t.Helper()
	var b strings.Builder
	if err := (htmlrenderer.Renderer{}).Render(&b, tree); err != nil {
		t.Fatal(err)
	}
	return b.String()
}

// roundTrip re-parses rendered Markdown as Markdoc to compare meaning rather
// than exact syntax.
func roundTrip(t *testing.T, tree any, r *md.Renderer) string {
	t.Helper()
	return renderHTML(t, transform(t, render(t, tree, r), nil))
}

func article(children ...any) *markdoc.Tag { return tag("article", nil, children...) }

func expect(t *testing.T, name, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("%s:\n  got:  %q\n  want: %q", name, got, want)
	}
}

func TestInput(t *testing.T) {
	expect(t, "empty array", render(t, []any{}, nil), "")
	expect(t, "nil", render(t, nil, nil), "")
	expect(t, "empty article", render(t, tag("article", nil), nil), "")
	expect(t, "string", render(t, "# Not a heading", nil), "\\# Not a heading\n")
	expect(t, "number", render(t, 42.0, nil), "42\n")
	content := []any{"a", 1, []any{true, nil, markdoc.NewOrderedMap(), tag("em", nil, "b")}}
	expect(t, "mixed scalar and array content", render(t, content, nil), "a1*b*\n")

	tree := transform(t, "- a\n- b\n\n| x |\n| - |\n| y |\n", nil)
	before, _ := json.Marshal(tree)
	render(t, tree, &md.Renderer{Handlers: map[string]md.Handler{"li": md.Children}})
	after, _ := json.Marshal(tree)
	expect(t, "does not mutate the input tree", string(after), string(before))
}

func TestStandardElements(t *testing.T) {
	roundTrips := map[string]string{
		"document": "# Heading\n\nParagraph with *em*, **strong**, ~~strike~~, `code`, and [a link](/docs/page#section \"Title\").\n\n![Alt text](/image.png \"Image title\")\n\n> Quote\n\n---\n\nLine\\\nbreak\n",
		"headings": "# Level 1\n\n## Level 2\n\n### Level 3\n\n#### Level 4\n\n##### Level 5\n\n###### Level 6\n",
		"lists":    "3. Three\n4. Four\n   - Nested\n     > Quoted\n5. Five\n",
		"loose":    "- One\n\n- Two\n\n  More\n",
		"fence":    "```js\nconst a = **1**;\n```\n",
		"table":    "| Name | Value |\n| :--- | ---: |\n| a | 1 |\n| *b* | `2` |\n",
	}
	for name, source := range roundTrips {
		expect(t, name, markdown(t, source, nil), source)
	}

	config := &markdoc.Config{Variables: map[string]any{"name": "Ada", "beta": false}}
	expect(t, "resolves variables and conditionals during transform",
		markdown(t, "Hello {% $name %}!\n\n{% if $beta %}\nBeta content\n{% else /%}\nStable content\n{% /if %}\n", config),
		"Hello Ada!\n\nStable content\n")
	expect(t, "keeps relative links and fragments", markdown(t, "[a](../b.md?x=1#y) [c](#d)", nil), "[a](../b.md?x=1#y) [c](#d)\n")
	expect(t, "autolink", markdown(t, "<https://example.com>", nil), "<https://example.com>\n")
	expect(t, "relative link with its href as text", render(t, tag("a", map[string]any{"href": "page"}, "page"), nil), "[page](page)\n")

	adjacent := []any{tag("ul", nil, tag("li", nil, "a")), tag("ul", nil, tag("li", nil, "b"))}
	expect(t, "keeps adjacent lists separate", render(t, adjacent, nil), "- a\n\n* b\n")
	expect(t, "adjacent lists round trip", roundTrip(t, adjacent, nil), "<article><ul><li>a</li></ul><ul><li>b</li></ul></article>")

	quotes := transform(t, "> Outer\n>\n> > Inner\n", nil)
	expect(t, "nested blockquotes", roundTrip(t, quotes, nil), renderHTML(t, quotes))

	expect(t, "lengthens fences around content containing fences",
		render(t, tag("pre", nil, "```\ninner\n```\n"), nil), "````\n```\ninner\n```\n````\n")
	code := tag("pre", map[string]any{"data-language": "ruby"},
		tag("span", map[string]any{"class": "keyword"}, "def"), " ", tag("em", nil, "*x*"), "\n")
	expect(t, "collects literal text inside code blocks", render(t, code, nil), "```ruby\ndef *x*\n```\n")

	expect(t, "Markdoc table tags",
		markdown(t, "{% table %}\n* Name\n* Value\n---\n* a\n* 1\n{% /table %}\n", nil),
		"| Name | Value |\n| --- | --- |\n| a | 1 |\n")
	wrappers := tag("div", nil, tag("Custom", map[string]any{"foo": "bar"}, tag("p", nil, "a ", tag("span", nil, "b"))))
	expect(t, "wrappers and unknown tags render as their children", render(t, wrappers, nil), "a b\n")
	expect(t, "omits frontmatter", markdown(t, "---\ntitle: x\n---\n\n# Hi", nil), "# Hi\n")
	expect(t, "drops whitespace at the edges of blocks",
		markdown(t, "## Title {% .large %}\n\n[Link](/a) {% .primary %} {% .secondary %}", nil), "## Title\n\n[Link](/a)\n")
}

func TestHandlers(t *testing.T) {
	blockquote := func(tag *markdoc.Tag, ctx md.Context) ([]*markdoc.Node, error) {
		children, err := ctx.RenderChildren(tag.Children)
		return []*markdoc.Node{newNode("blockquote", children)}, err
	}

	config := &markdoc.Config{Tags: map[string]*markdoc.Schema{
		"callout": {Render: "Callout", Children: []string{"paragraph", "list"}},
		"layout":  {Render: "Layout"},
		"button":  {Render: "CopyButton", SelfClosing: true},
	}}
	tree := transform(t, "{% layout %}\n{% callout %}\nNote with **bold**\n\n- item\n{% /callout %}\n{% button /%}\n{% /layout %}", config)
	got := render(t, tree, &md.Renderer{Handlers: map[string]md.Handler{
		"Callout": blockquote, "Layout": md.Children, "CopyButton": md.None,
	}})
	expect(t, "converts custom components", got, "> Note with **bold**\n> \n> - item\n")

	got = render(t, transform(t, "# Title\n\nText", nil), &md.Renderer{Handlers: map[string]md.Handler{
		"h1": func(tag *markdoc.Tag, ctx md.Context) ([]*markdoc.Node, error) {
			children, err := ctx.RenderChildren(tag.Children)
			return []*markdoc.Node{newNode("paragraph", []*markdoc.Node{newNode("strong", children)})}, err
		},
		"p": md.None,
	}})
	expect(t, "takes precedence over built-in elements", got, "**Title**\n")

	expect(t, "omits whole subtrees for None",
		render(t, tag("Hidden", nil, tag("p", nil, "secret")), &md.Renderer{Handlers: map[string]md.Handler{"Hidden": md.None}}), "")

	got = render(t, tag("Outer", nil, tag("Inner", nil, "text")), &md.Renderer{Handlers: map[string]md.Handler{
		"Outer": blockquote,
		"Inner": func(tag *markdoc.Tag, ctx md.Context) ([]*markdoc.Node, error) {
			children, err := ctx.RenderChildren(tag.Children)
			return []*markdoc.Node{newNode("em", children), newNode("text", nil, "content", "!")}, err
		},
	}})
	expect(t, "renders nested children through handlers", got, "> *text*!\n")

	got = render(t, transform(t, "| a |\n| - |\n| b |", nil), &md.Renderer{Handlers: map[string]md.Handler{
		"table": func(tag *markdoc.Tag, _ md.Context) ([]*markdoc.Node, error) {
			b, _ := json.Marshal(len(tag.Children))
			return []*markdoc.Node{newNode("fence", nil, "content", string(b)+"\n")}, nil
		},
	}})
	expect(t, "can render rich table cells", got, "```\n2\n```\n")

	handlerErr := func(*markdoc.Tag, md.Context) ([]*markdoc.Node, error) {
		return nil, errorString("handler failed")
	}
	if _, err := renderErr(tag("Broken", nil, "x"), &md.Renderer{Handlers: map[string]md.Handler{"Broken": handlerErr}}); err == nil || err.Error() != "handler failed" {
		t.Errorf("propagates handler errors: %v", err)
	}
	nested := tag("Outer", nil, tag("Broken", nil))
	if _, err := renderErr(nested, &md.Renderer{Handlers: map[string]md.Handler{"Outer": blockquote, "Broken": handlerErr}}); err == nil || err.Error() != "handler failed" {
		t.Errorf("propagates nested handler errors: %v", err)
	}

	returning := func(nodes ...*markdoc.Node) *md.Renderer {
		return &md.Renderer{Handlers: map[string]md.Handler{"Bad": func(*markdoc.Tag, md.Context) ([]*markdoc.Node, error) {
			return nodes, nil
		}}}
	}
	annotated := newNode("paragraph", nil)
	annotated.Annotations = append(annotated.Annotations, markdoc.AttributeValue{Type: "class", Name: "x", Value: true})
	for _, c := range []struct {
		node *markdoc.Node
		err  string
	}{
		{nil, "must return Markdoc AST nodes"},
		{markdoc.NewNode("tag", nil, nil, "callout"), `Markdoc tag "callout"`},
		{newNode("text", nil, "content", &markdoc.Variable{Path: []any{"name"}}), "unresolved Variable"},
		{annotated, "annotations"},
		{newNode("comment", nil, "content", "x"), `"comment" node`},
		{newNode("paragraph", []*markdoc.Node{nil}), "must be Markdoc AST nodes"},
	} {
		if _, err := renderErr(tag("Bad", nil), returning(c.node)); err == nil || !strings.Contains(err.Error(), c.err) {
			t.Errorf("rejects %s: got %v", c.err, err)
		}
	}

	text := newNode("text", nil, "content", "a")
	list := func() *markdoc.Node {
		return newNode("list", []*markdoc.Node{newNode("item", []*markdoc.Node{text})}, "ordered", false)
	}
	returned := []*markdoc.Node{list(), list()}
	before, _ := json.Marshal(returned)
	expect(t, "renders handler-returned lists", render(t, tag("Bad", nil), returning(returned...)), "- a\n\n* a\n")
	after, _ := json.Marshal(returned)
	expect(t, "does not mutate handler-returned nodes", string(after), string(before))
}

type errorString string

func (e errorString) Error() string { return string(e) }

// commonMark parses Markdown as CommonMark with GFM, as markdown-it does.
func commonMark(t *testing.T, src string) (gast.Node, []byte) {
	t.Helper()
	g := goldmark.New(goldmark.WithExtensions(extension.GFM))
	doc := g.Parser().Parse(text.NewReader([]byte(src)))
	var b bytes.Buffer
	if err := g.Renderer().Render(&b, []byte(src), doc); err != nil {
		t.Fatal(err)
	}
	return doc, b.Bytes()
}

func kinds(doc gast.Node) map[gast.NodeKind]int {
	counts := map[gast.NodeKind]int{}
	_ = gast.Walk(doc, func(n gast.Node, entering bool) (gast.WalkStatus, error) {
		if entering {
			counts[n.Kind()]++
		}
		return gast.WalkContinue, nil
	})
	return counts
}

func TestEscaping(t *testing.T) {
	for _, value := range []string{
		"*not em* _nor this_ ~~or this~~",
		"[not](a link) ![nor](an image)",
		"<b>not html</b> <https://not.autolink>",
		"`not code` and a \\ backslash",
		"&amp; &#42; &copy; & plain ampersand",
		"{% not_a_tag %} {{ fine }}",
		"a | b | c",
		"snake_case and __dunder__ and 2 * 3",
		"C#",
	} {
		tree := transform(t, "Text: {% $value %}", &markdoc.Config{Variables: map[string]any{"value": value}})
		expect(t, "keeps the meaning of "+value, roundTrip(t, tree, nil),
			renderHTML(t, article(tag("p", nil, "Text: "+value))))
	}

	for _, value := range []string{
		"# not a heading", "- not a list", "+ not a list", "1. not a list", "2) not a list",
		"> not a quote", "---", "===", "    not code", "```not a fence",
	} {
		for _, content := range []any{value, "first\n" + value, tag("ul", nil, tag("li", nil, value))} {
			out := render(t, content, nil)
			doc, htmlOut := commonMark(t, out)
			k := kinds(doc)
			for _, kind := range []gast.NodeKind{gast.KindHeading, gast.KindBlockquote, gast.KindThematicBreak, gast.KindCodeBlock, gast.KindFencedCodeBlock} {
				if k[kind] > 0 {
					t.Errorf("line start %q in %#v: rendered %q has a %v", value, content, out, kind)
				}
			}
			lists := 0
			if _, ok := content.(*markdoc.Tag); ok {
				lists = 1
			}
			if k[gast.KindList] != lists {
				t.Errorf("line start %q in %#v: rendered %q has %d lists", value, content, out, k[gast.KindList])
			}
			if want := html.EscapeString(strings.TrimSpace(value)); !strings.Contains(string(htmlOut), strings.ReplaceAll(want, "&#34;", "&quot;")) {
				t.Errorf("line start %q in %#v: %q renders as %q", value, content, out, htmlOut)
			}
		}
	}

	expect(t, "keeps readable text readable",
		render(t, []any{"Markdoc", tag("strong", nil, "-based"), " x-y (z) 50% done!"}, nil),
		"Markdoc**-based** x-y (z) 50% done!\n")
	heading := tag("h2", nil, "Issue #")
	expect(t, "escapes trailing heading closing sequences", render(t, heading, nil), "## Issue \\#\n")
	expect(t, "trailing # round trip", roundTrip(t, heading, nil), "<article><h2>Issue #</h2></article>")
	expect(t, "collapses newlines in text", render(t, "a\n\n\n    b", nil), "a\nb\n")
	expect(t, "collapses newlines in headings", render(t, tag("h1", nil, "a\nb"), nil), "# a b\n")
	expect(t, "moves boundary whitespace outside emphasis", render(t, []any{"a", tag("strong", nil, " b "), "c"}, nil), "a **b** c\n")
	expect(t, "drops whitespace-only emphasis", render(t, tag("em", nil, " "), nil), "")
	expect(t, "preserves non-breaking spaces", render(t, "a\u00a0b", nil), "a&nbsp;b\n")
}

func TestInlineCode(t *testing.T) {
	for _, value := range []string{
		"plain", "one ` tick", "two `` ticks and one `", "`leading", "trailing`", " padded ", "  ", `*not em* <b> \ & [x](y)`,
	} {
		out := render(t, tag("p", nil, tag("code", nil, value)), nil)
		code := markdoc.Parse(out).Children[0].Children[0].Children[0]
		if code.Type != "code" || code.Attributes.Get("content") != value {
			t.Errorf("keeps %q literal: rendered %q, parsed as %s %q", value, out, code.Type, code.Attributes.Get("content"))
		}
	}
	expect(t, "omits empty code", render(t, []any{"a", tag("code", nil)}, nil), "a\n")
}

func TestLinkAndImageFields(t *testing.T) {
	content := tag("p", nil,
		tag("a", map[string]any{"href": `/a (b)\c`, "title": `say "hi" &amp;`}, "[x]"),
		" ",
		tag("img", map[string]any{"src": "/i(1).png", "alt": "[alt] *x*", "title": "t"}),
		" ",
		tag("a", map[string]any{"href": ""}, "empty"),
	)
	out := render(t, content, nil)
	expect(t, "escapes link and image fields", out,
		`[\[x\]](</a (b)\\c> "say \"hi\" \&amp;") ![\[alt\] \*x\*](/i\(1\).png "t") [empty](<>)`+"\n")

	// Markdoc's parser uses the raw label as alt text, so check the
	// CommonMark interpretation directly
	_, got := commonMark(t, out)
	expect(t, "CommonMark reads the fields back", string(got),
		`<p><a href="/a%20(b)%5Cc" title="say &quot;hi&quot; &amp;amp;">[x]</a> <img src="/i(1).png" alt="[alt] *x*" title="t"> <a href="">empty</a></p>`+"\n")
}

func TestTables(t *testing.T) {
	table := func(rows [][]any, head ...any) *markdoc.Tag {
		var children []any
		if head != nil {
			var cells []any
			for _, c := range head {
				cells = append(cells, tag("th", nil, c))
			}
			children = append(children, tag("thead", nil, tag("tr", nil, cells...)))
		}
		var body []any
		for _, row := range rows {
			var cells []any
			for _, c := range row {
				cells = append(cells, tag("td", nil, c))
			}
			body = append(body, tag("tr", nil, cells...))
		}
		return tag("table", nil, append(children, tag("tbody", nil, body...))...)
	}

	nested := tag("blockquote", nil, tag("ul", nil, tag("li", nil, table([][]any{{"1", "22"}}, "a", "bbb"))))
	expect(t, "renders compact tables in nested containers", render(t, nested, nil),
		"> - | a | bbb |\n>   | --- | --- |\n>   | 1 | 22 |\n")
	expect(t, "nested table round trip", roundTrip(t, nested, nil), renderHTML(t, article(nested)))

	expect(t, "renders headerless tables with an empty header", render(t, table([][]any{{"a", "b"}}), nil),
		"|  |  |\n| --- | --- |\n| a | b |\n")
	expect(t, "renders empty tables as nothing", render(t, tag("table", nil), nil), "")
	expect(t, "renders tables with an empty body as nothing", render(t, tag("table", nil, tag("tbody", nil)), nil), "")
	expect(t, "pads ragged rows", render(t, table([][]any{{"a"}, {"b", "c", "d"}}, "h"), nil),
		"| h |  |  |\n| --- | --- | --- |\n| a |  |  |\n| b | c | d |\n")

	pipes := table([][]any{{tag("code", nil, "a|b"), "c | d"}}, "x", "y")
	expect(t, "escapes pipes in cells, including code", render(t, pipes, nil),
		"| x | y |\n| --- | --- |\n| `a\\|b` | c \\| d |\n")
	expect(t, "pipes round trip", roundTrip(t, pipes, nil), renderHTML(t, article(pipes)))

	// Checked against GitHub: only `\|` is unescaped in a cell's code
	var codes []any
	for _, c := range []string{`C:\Users\a|b`, `a\|b`, `a\\|b`, `x\`} {
		codes = append(codes, tag("code", nil, c))
	}
	backslashes := table([][]any{codes}, "w", "x", "y", "z")
	expect(t, "keeps backslashes in code in cells literal", render(t, backslashes, nil),
		"| w | x | y | z |\n| --- | --- | --- | --- |\n| `C:\\Users\\a\\|b` | `a\\\\|b` | `a\\\\\\|b` | `x\\` |\n")
	expect(t, "backslashes round trip", roundTrip(t, backslashes, nil), renderHTML(t, article(backslashes)))

	expect(t, "flattens block content in cells",
		markdown(t, "{% table %}\n* Heading\n* Cell\n---\n*\n  First paragraph\n\n  - item one\n  - item two\n\n  ```js\n  code()\n  ```\n* | nested |\n  | ------ |\n  | table  |\n{% /table %}", nil),
		"| Heading | Cell |\n| --- | --- |\n| First paragraph item one item two `code()` | nested table |\n")
	expect(t, "drops whitespace between flattened blocks in cells",
		markdown(t, "{% table %}\n* Heading\n---\n*\n  ### Title {% .large %}\n\n  Body\n{% /table %}", nil),
		"| Heading |\n| --- |\n| Title Body |\n")

	extraHead := tag("table", nil, tag("thead", nil, tag("tr", nil, tag("th", nil, "a")), tag("tr", nil, tag("th", nil, "b"))))
	expect(t, "keeps extra header rows as body rows", render(t, extraHead, nil), "| a |\n| --- |\n| b |\n")
}

// TestFixtures compares the output with @markdoc/markdoc's where the
// fixtures record it, which they do if it renders Markdown.
func TestFixtures(t *testing.T) {
	rendertest.Run(t, func(f fixtures.Fixture) json.RawMessage { return f.MD }, md.Renderer{}.Render)
}
