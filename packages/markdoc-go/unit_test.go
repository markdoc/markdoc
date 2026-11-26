package markdoc

// Ports of the JS unit tests that build nodes and tags by hand, which the
// fixtures can't express. Each test names the JS test file it mirrors.

import (
	"errors"
	"strings"
	"testing"
)

// attrs builds an *OrderedMap from alternating keys and values.
func attrs(kv ...any) *OrderedMap {
	m := NewOrderedMap()
	for i := 0; i < len(kv); i += 2 {
		m.Set(kv[i].(string), kv[i+1])
	}
	return m
}

func textNode(content any) *Node { return NewNode("text", attrs("content", content), nil, "") }

func inlineText(content string) *Node {
	return NewNode("inline", nil, []*Node{textNode(content)}, "")
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := marshalJS(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func assertJSON(t *testing.T, got, want any) {
	t.Helper()
	if g, w := mustJSON(t, got), mustJSON(t, want); g != w {
		t.Errorf("got  %s\nwant %s", g, w)
	}
}

func mustTransform(t *testing.T, n *Node, c *Config) any {
	t.Helper()
	out, err := Transform(n, c)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func TestIsTag(t *testing.T) {
	for _, v := range []any{nil, "x", 1.0, attrs("name", "div"), []any{}, (*Tag)(nil)} {
		if IsTag(v) {
			t.Errorf("IsTag(%#v) = true", v)
		}
	}
	if !IsTag(NewTag("", nil, nil)) {
		t.Error("IsTag(NewTag()) = false")
	}
	if got := NewTag("", nil, nil); got.Name != "div" || got.Attributes == nil || got.Children == nil {
		t.Errorf("NewTag defaults: %#v", got)
	}
}

// ast/node.test.ts

func TestTransformBuiltInNodes(t *testing.T) {
	heading := func(level any) *Node {
		return NewNode("heading", attrs("level", level), []*Node{inlineText("This is a heading")}, "")
	}

	assertJSON(t, mustTransform(t, heading(1.0), nil), NewTag("h1", nil, []any{"This is a heading"}))

	for _, level := range []any{"1>x", "2", 0.0, 7.0, 1.5} {
		assertJSON(t, mustTransform(t, heading(level), nil), []any{"This is a heading"})
	}

	fence := NewNode("fence", attrs("language", "ruby", "content", "test"), nil, "")
	assertJSON(t, mustTransform(t, fence, nil), NewTag("pre", attrs("data-language", "ruby"), []any{"test"}))

	custom := *Nodes["fence"]
	custom.Render = "Code"
	fence = NewNode("fence", attrs("language", "ruby", "content", "test", "process", false), nil, "")
	assertJSON(t,
		mustTransform(t, fence, &Config{Nodes: map[string]*Schema{"fence": &custom}}),
		NewTag("Code", attrs("data-language", "ruby"), []any{"test"}))

	code := *Nodes["code"]
	code.Render = "InlineCode"
	assertJSON(t,
		mustTransform(t, NewNode("code", attrs("content", "test"), nil, ""), &Config{Nodes: map[string]*Schema{"code": &code}}),
		NewTag("InlineCode", nil, []any{"test"}))
}

func TestTransformFunctions(t *testing.T) {
	foo := &Schema{Transform: func(*Node, *Config) (any, error) { return NewTag("foo", nil, nil), nil }}
	assertJSON(t,
		mustTransform(t, NewNode("foo", nil, nil, ""), &Config{Nodes: map[string]*Schema{"foo": foo}}),
		NewTag("foo", nil, nil))

	foo = &Schema{
		Attributes: []SchemaAttribute{
			{Name: "bar", Type: TypeString},
			{Name: "test", Type: TypeNumber, Render: "example"},
		},
		Transform: func(n *Node, c *Config) (any, error) {
			a, err := n.TransformAttributes(c)
			return attrs("name", "foo", "attributes", a), err
		},
	}
	assertJSON(t,
		mustTransform(t, NewNode("foo", attrs("bar", "baz", "test", 100.0), nil, ""), &Config{Nodes: map[string]*Schema{"foo": foo}}),
		attrs("name", "foo", "attributes", attrs("bar", "baz", "example", 100.0)))

	failing := &Schema{Transform: func(*Node, *Config) (any, error) { return nil, errors.New("boom") }}
	doc := NewNode("document", nil, []*Node{NewNode("foo", nil, nil, "")}, "")
	if _, err := Transform(doc, &Config{Nodes: map[string]*Schema{"foo": failing}}); err == nil || err.Error() != "boom" {
		t.Errorf("a failing transform: got error %v", err)
	}
}

func TestTransformTags(t *testing.T) {
	tags := map[string]*Schema{
		"foo": {Render: "foo", Attributes: []SchemaAttribute{{Name: "bar", Type: TypeString}}},
	}
	example := NewNode("tag", attrs("bar", "baz"), []*Node{inlineText("test")}, "foo")
	assertJSON(t, mustTransform(t, example, &Config{Tags: tags}), NewTag("foo", attrs("bar", "baz"), []any{"test"}))

	example = NewNode("container", attrs("bar", "baz"), []*Node{inlineText("test")}, "")
	assertJSON(t, mustTransform(t, example, &Config{Tags: tags}), []any{"test"})

	nodes := map[string]*Schema{"foo": {}, "bar": {Render: "bar"}}
	example = NewNode("foo", nil, []*Node{NewNode("bar", nil, nil, "")}, "")
	assertJSON(t, mustTransform(t, example, &Config{Nodes: nodes}), []any{NewTag("bar", nil, nil)})
}

func TestTransformAttributes(t *testing.T) {
	assertJSON(t,
		mustTransform(t, NewNode("paragraph", attrs("id", "bar"), nil, ""), nil),
		NewTag("p", attrs("id", "bar"), nil))
	assertJSON(t,
		mustTransform(t, NewNode("paragraph", attrs("class", attrs("foo", true, "bar", false)), nil, ""), nil),
		NewTag("p", attrs("class", "foo"), nil))

	foo := func(attributes ...SchemaAttribute) *Config {
		return &Config{Nodes: map[string]*Schema{"foo": {Render: "foo", Attributes: attributes}}}
	}
	example := NewNode("foo", attrs("bar", 1.0, "baz", "test"), nil, "")
	assertJSON(t,
		mustTransform(t, example, foo(SchemaAttribute{Name: "bar", Type: TypeNumber}, SchemaAttribute{Name: "baz", Type: TypeString})),
		NewTag("foo", attrs("bar", 1.0, "baz", "test"), nil))
	assertJSON(t,
		mustTransform(t, example, foo(SchemaAttribute{Name: "bar", Render: "data-bar"}, SchemaAttribute{Name: "baz", Render: "data-baz"})),
		NewTag("foo", attrs("data-bar", 1.0, "data-baz", "test"), nil))
	assertJSON(t,
		mustTransform(t, example, foo(SchemaAttribute{Name: "bar", Type: TypeNumber})),
		NewTag("foo", attrs("bar", 1.0), nil))

	withDefault := foo(SchemaAttribute{Name: "bar", Type: TypeNumber, Default: 10.0})
	assertJSON(t, mustTransform(t, NewNode("foo", nil, nil, ""), withDefault), NewTag("foo", attrs("bar", 10.0), nil))
	assertJSON(t, mustTransform(t, NewNode("foo", attrs("bar", 1.0), nil, ""), withDefault), NewTag("foo", attrs("bar", 1.0), nil))

	nested := NewNode("foo", attrs("bar", &Variable{Path: []any{"a", "b", "c"}}), nil, "")
	config := foo(SchemaAttribute{Name: "bar", Type: TypeString})
	config.Variables = map[string]any{"a": map[string]any{"b": map[string]any{"c": "example"}}}
	assertJSON(t, mustTransform(t, nested, config), NewTag("foo", attrs("bar", "example"), nil))

	// custom types
	tag := func(typ AttributeType) *Config {
		return &Config{Nodes: map[string]*Schema{"tag": {Render: "tag", Attributes: []SchemaAttribute{{Name: "bar", Type: typ}}}}}
	}
	assertJSON(t,
		mustTransform(t, NewNode("tag", nil, nil, ""), tag(nonNullStringType{})),
		NewTag("tag", attrs("bar", ""), nil))
	assertJSON(t,
		mustTransform(t, NewNode("tag", attrs("bar", "test"), nil, ""), tag(upperCaseStringType{})),
		NewTag("tag", attrs("bar", "TEST"), nil))
}

func TestResolveCopies(t *testing.T) {
	values := []any{&Variable{Path: []any{"value"}}}
	node := NewNode("tag", attrs("nested", attrs("values", values)), []*Node{textNode(&Variable{Path: []any{"value"}})}, "")
	node.Slots.Set("title", textNode(&Function{Name: "identity", Parameters: attrs("0", &Variable{Path: []any{"value"}})}))
	config := &Config{
		Variables: map[string]any{"value": "resolved"},
		Functions: map[string]*ConfigFunction{"identity": {
			Transform: func(p *OrderedMap, _ *Config) (any, error) { return p.Get("0"), nil },
		}},
	}
	resolved, err := node.Resolve(config)
	if err != nil {
		t.Fatal(err)
	}
	assertJSON(t, resolved.Attributes.Get("nested"), attrs("values", []any{"resolved"}))
	if got := resolved.Children[0].Attributes.Get("content"); got != "resolved" {
		t.Errorf("child content: %v", got)
	}
	if got := resolved.Slots.Get("title").(*Node).Attributes.Get("content"); got != "resolved" {
		t.Errorf("slot content: %v", got)
	}
	if resolved == node || resolved.Children[0] == node.Children[0] || resolved.Attributes == node.Attributes ||
		resolved.Slots == node.Slots || resolved.Slots.Get("title") == node.Slots.Get("title") {
		t.Error("Resolve shares values with the original")
	}
	if _, ok := node.Children[0].Attributes.Get("content").(*Variable); !ok {
		t.Error("Resolve changed the original")
	}
}

// ast/variable.test.ts

func TestVariableResolve(t *testing.T) {
	config := &Config{Variables: map[string]any{
		"foo": map[string]any{"bar": "example", "baz": []any{1.0, map[string]any{"qux": "value"}, 2.0}},
	}}
	resolve := func(v *Variable, c *Config) any {
		out, err := v.Resolve(c)
		if err != nil {
			t.Fatal(err)
		}
		return out
	}
	if got := resolve(&Variable{Path: []any{"foo", "bar"}}, config); got != "example" {
		t.Errorf("basic resolution: %v", got)
	}
	if got := resolve(&Variable{Path: []any{"foo", "baz", 1.0, "qux"}}, config); got != "value" {
		t.Errorf("resolution with a number in the path: %v", got)
	}
	if got := resolve(&Variable{Path: []any{"foo", "missing", "deep"}}, config); got != Undefined {
		t.Errorf("missing path: %v", got)
	}
	var seen []any
	fn := &Config{VariableFunc: func(path []any) any { seen = path; return "example" }}
	if got := resolve(&Variable{Path: []any{"foo", "bar"}}, fn); got != "example" || mustJSON(t, seen) != `["foo","bar"]` {
		t.Errorf("resolution with a function: %v, path %v", got, seen)
	}

	type page struct {
		Title string `json:"title"`
		Tags  []string
	}
	structs := &Config{Variables: map[string]any{"page": &page{Title: "T", Tags: []string{"a", "b"}}}}
	if got := resolve(&Variable{Path: []any{"page", "title"}}, structs); got != "T" {
		t.Errorf("struct field by json name: %v", got)
	}
	if got := resolve(&Variable{Path: []any{"page", "Tags", 1.0}}, structs); got != "b" {
		t.Errorf("struct slice field: %v", got)
	}

	nullConfig := &Config{Variables: map[string]any{"n": nil}}
	if _, err := (&Variable{Path: []any{"n", "prop"}}).Resolve(nullConfig); err == nil ||
		!strings.Contains(err.Error(), "Cannot read properties of null (reading 'prop')") {
		t.Errorf("reading a property of null: %v", err)
	}
}

// functions/index.test.ts

func TestEqualsFunction(t *testing.T) {
	example := &Function{Name: "equals", Parameters: attrs("0", &Variable{Path: []any{"foo"}}, "1", "bar")}
	for value, want := range map[string]bool{"bar": true, "baz": false} {
		got, err := example.Resolve(&Config{Functions: Functions, Variables: map[string]any{"foo": value}})
		if err != nil || got != want {
			t.Errorf("equals with foo=%q: %v, %v", value, got, err)
		}
	}
}

// formatter.test.ts

func TestFormatNodes(t *testing.T) {
	if got := Format(nil, nil); got != "" {
		t.Errorf("empty: %q", got)
	}
	node := NewNode("tag", attrs("undefinedAttribute", Undefined, "validAttribute", true), nil, "tag")
	if got := strings.TrimSpace(Format(node, nil)); got != "{% tag validAttribute=true /%}" {
		t.Errorf("skips over undefined variables: %q", got)
	}
	if got := Format(NewNode("fence", attrs("content", "foo"), nil, ""), nil); got != "```\nfoo\n```\n" {
		t.Errorf("fence without an ending newline: %q", got)
	}
}
