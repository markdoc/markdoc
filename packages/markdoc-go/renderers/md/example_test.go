package md_test

import (
	"os"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/renderers/md"
)

func ExampleRenderer() {
	doc := markdoc.Parse("# Install\n\n{% callout %}\nRun `go get`.\n{% /callout %}\n")
	config := &markdoc.Config{Tags: map[string]*markdoc.Schema{"callout": {Render: "Callout"}}}
	tree, err := markdoc.Transform(doc, config)
	if err != nil {
		panic(err)
	}

	r := md.Renderer{Handlers: map[string]md.Handler{
		// Render callouts as blockquotes
		"Callout": func(tag *markdoc.Tag, ctx md.Context) ([]*markdoc.Node, error) {
			children, err := ctx.RenderChildren(tag.Children)
			return []*markdoc.Node{markdoc.NewNode("blockquote", nil, children, "")}, err
		},
	}}
	if err := r.Render(os.Stdout, tree); err != nil {
		panic(err)
	}
	// Output:
	// # Install
	//
	// > Run `go get`.
}
