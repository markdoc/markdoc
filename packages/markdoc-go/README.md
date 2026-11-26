# Markdoc for Go

A Go implementation of [Markdoc](https://markdoc.dev). It parses, validates,
transforms and formats documents with the same results as
[`@markdoc/markdoc`](../markdoc), byte for byte, and supports multiple
[renderers](#renderers).

```shell
go get markdoc.dev/markdoc
```

## Usage

Parse a document, validate it against your schemas, and transform it into a
renderable tree:

```go
import "markdoc.dev/markdoc"

source := `# Getting started

{% callout type="tip" %}
Install with **go get**.
{% /callout %}
`

config := &markdoc.Config{
	Tags: map[string]*markdoc.Schema{
		"callout": {
			Render: "Callout",
			Attributes: []markdoc.SchemaAttribute{
				{Name: "type", Type: markdoc.TypeString, Default: "note"},
			},
		},
	},
}

doc := markdoc.Parse(source)
for _, e := range markdoc.Validate(doc, config) {
	fmt.Println(e.Error.Message)
}
tree, err := markdoc.Transform(doc, config)
```

Markdoc's built-in nodes become tags such as `h1`, `p` and `strong`. Custom
tags become the name their schema renders, here `Callout`, which a renderer's
handlers turn into output.

## Renderers

Each renderer is a `Renderer` value. Its zero value renders the built-in
nodes, and `Handlers`, keyed by rendered tag name, render everything else.
A handler calls `ctx.RenderChildren` to render the tag's children, and
`Children` and `None` render a tag as its children or as nothing.

### HTML

```go
import "markdoc.dev/markdoc/renderers/html"

r := html.Renderer{Handlers: map[string]html.Handler{
	"Callout": func(tag *markdoc.Tag, ctx html.Context) (any, error) {
		children, err := ctx.RenderChildren(tag.Children)
		attrs := markdoc.NewOrderedMap()
		attrs.Set("class", "callout "+tag.Attributes.Get("type").(string))
		return markdoc.NewTag("aside", attrs, []any{children}), err
	},
}}
err := r.Render(os.Stdout, tree)
```

```html
<article><h1>Getting started</h1><aside class="callout tip"><p>Install with <strong>go get</strong>.</p></aside></article>
```

HTML handlers return a tree of tags and text, which is escaped like the rest
of the output.

### Markdown

```go
import "markdoc.dev/markdoc/renderers/md"

r := md.Renderer{Handlers: map[string]md.Handler{
	"Callout": func(tag *markdoc.Tag, ctx md.Context) ([]*markdoc.Node, error) {
		children, err := ctx.RenderChildren(tag.Children)
		return []*markdoc.Node{markdoc.NewNode("blockquote", nil, children, "")}, err
	},
}}
err := r.Render(os.Stdout, tree)
```

```markdown
# Getting started

> Install with **go get**.
```

Markdown handlers return Markdown nodes, such as `paragraph`, `list` and
`text`, and the output is CommonMark with GFM tables. Text is escaped so it
keeps its meaning, and content Markdown can't express, such as a Markdoc tag,
is an error.

## Development

The tests compare every result with `@markdoc/markdoc`, using fixtures
generated from its workspace build:

```shell
pnpm --filter @markdoc/markdoc build
pnpm --filter @markdoc/markdoc-go test
```
