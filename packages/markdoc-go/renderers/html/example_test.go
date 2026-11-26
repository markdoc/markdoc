package html_test

import (
	"os"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/renderers/html"
)

func ExampleRenderer() {
	doc := markdoc.Parse("{% callout %}\nRun `go get`.\n{% /callout %}\n")
	config := &markdoc.Config{Tags: map[string]*markdoc.Schema{"callout": {Render: "Callout"}}}
	tree, err := markdoc.Transform(doc, config)
	if err != nil {
		panic(err)
	}

	r := html.Renderer{Handlers: map[string]html.Handler{
		// Render callouts as an aside with a class
		"Callout": func(tag *markdoc.Tag, ctx html.Context) (any, error) {
			children, err := ctx.RenderChildren(tag.Children)
			class := markdoc.NewOrderedMap()
			class.Set("class", "callout")
			return markdoc.NewTag("aside", class, []any{children}), err
		},
	}}
	if err := r.Render(os.Stdout, tree); err != nil {
		panic(err)
	}
	// Output:
	// <article><aside class="callout"><p>Run <code>go get</code>.</p></aside></article>
}
