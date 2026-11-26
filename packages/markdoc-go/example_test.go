package markdoc_test

import (
	"fmt"
	"os"
	"strings"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/renderers/html"
)

func Example() {
	doc := markdoc.Parse("# Hello {% $name %}\n\n{% callout type=\"tip\" %}\nUse **tags**.\n{% /callout %}\n")

	config := &markdoc.Config{
		Variables: map[string]any{"name": "Markdoc"},
		Tags: map[string]*markdoc.Schema{
			"callout": {
				Render: "aside",
				Attributes: []markdoc.SchemaAttribute{
					{Name: "type", Type: markdoc.TypeString, Default: "note", Matches: markdoc.MatchList("note", "tip")},
				},
			},
		},
	}

	for _, e := range markdoc.Validate(doc, config) {
		fmt.Println(e.Error.Message)
	}
	tree, err := markdoc.Transform(doc, config)
	if err != nil {
		panic(err)
	}
	if err := (html.Renderer{}).Render(os.Stdout, tree); err != nil {
		panic(err)
	}
	// Output:
	// <article><h1>Hello Markdoc</h1><aside type="tip"><p>Use <strong>tags</strong>.</p></aside></article>
}

func ExampleValidate() {
	doc := markdoc.Parse("{% callout type=\"oops\" %}\nText\n{% /callout %}\n\n{% unknown /%}\n")
	config := &markdoc.Config{
		Tags: map[string]*markdoc.Schema{
			"callout": {
				Attributes: []markdoc.SchemaAttribute{
					{Name: "type", Type: markdoc.TypeString, Matches: markdoc.MatchList("note", "tip")},
				},
			},
		},
	}
	for _, e := range markdoc.Validate(doc, config) {
		fmt.Println(e.Lines, e.Error.Level, e.Error.Message)
	}
	// Output:
	// [0 1 2 3] error Attribute 'type' must match one of ["note","tip"]. Got 'oops' instead.
	// [4 5] critical Undefined tag: 'unknown'
}

func ExampleSchema_transform() {
	// A Transform hook builds the output itself.
	config := &markdoc.Config{
		Tags: map[string]*markdoc.Schema{
			"shout": {
				Transform: func(node *markdoc.Node, config *markdoc.Config) (any, error) {
					children, err := node.TransformChildren(config)
					if err != nil {
						return nil, err
					}
					for i, c := range children {
						if s, ok := c.(string); ok {
							children[i] = strings.ToUpper(s)
						}
					}
					return markdoc.NewTag("strong", nil, children), nil
				},
			},
		},
	}
	tree, _ := markdoc.Transform(markdoc.Parse("Say {% shout %}hello{% /shout %}."), config)
	if err := (html.Renderer{}).Render(os.Stdout, tree); err != nil {
		panic(err)
	}
	// Output:
	// <article><p>Say <strong>HELLO</strong>.</p></article>
}

func ExampleConfigFunction() {
	config := &markdoc.Config{
		Functions: map[string]*markdoc.ConfigFunction{
			"uppercase": {
				Transform: func(parameters *markdoc.OrderedMap, _ *markdoc.Config) (any, error) {
					s, _ := parameters.Get("0").(string)
					return strings.ToUpper(s), nil
				},
			},
		},
	}
	tree, _ := markdoc.Transform(markdoc.Parse(`{% uppercase("hi") %} and {% if equals(1, 1) %}equal{% /if %}`), config)
	if err := (html.Renderer{}).Render(os.Stdout, tree); err != nil {
		panic(err)
	}
	// Output:
	// <article><p>HI and equal</p></article>
}

func ExampleFormat() {
	doc := markdoc.Parse("# Title {% #main %}\n\n*  one\n*  two\n\n{% callout   type=\"tip\"  %}\nHi\n{% /callout %}\n")
	fmt.Print(markdoc.Format(doc, nil))
	// Output:
	// # Title {% #main %}
	//
	// * one
	// * two
	//
	// {% callout type="tip" %}
	// Hi
	// {% /callout %}
}
