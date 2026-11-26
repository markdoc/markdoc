package markdoc

// A port of packages/markdoc/src/schema.ts and schema-types/.

import (
	"math"
	"strings"

	"markdoc.dev/markdoc/internal/js"
)

var blockChildren = []string{"heading", "paragraph", "image", "table", "tag", "fence", "blockquote", "list", "hr"}

// Nodes are the built-in node schemas. Transform and Validate use them for
// node types that the config doesn't override.
var Nodes = map[string]*Schema{
	"document": {
		Render:     "article",
		Children:   []string{"heading", "paragraph", "image", "table", "tag", "fence", "blockquote", "comment", "list", "hr"},
		Attributes: []SchemaAttribute{{Name: "frontmatter", NoRender: true}},
	},
	"heading": {
		Children:   []string{"inline"},
		Attributes: []SchemaAttribute{{Name: "level", Type: TypeNumber, NoRender: true, Required: true}},
		Transform: func(node *Node, config *Config) (any, error) {
			level, ok := node.Attributes.Get("level").(float64)
			// The level becomes part of the tag name, so only accept h1-h6.
			// Otherwise render the children without a wrapping element.
			if !ok || level != math.Trunc(level) || level < 1 || level > 6 {
				return node.TransformChildren(config)
			}
			return transformTag("h"+js.FormatNumber(level), node, config, nil)
		},
	},
	"paragraph": {Render: "p", Children: []string{"inline"}},
	"image": {
		Render: "img",
		Attributes: []SchemaAttribute{
			{Name: "src", Type: TypeString, Required: true},
			{Name: "alt", Type: TypeString},
			{Name: "title", Type: TypeString},
		},
	},
	"fence": {
		Render: "pre",
		Attributes: []SchemaAttribute{
			{Name: "content", Type: TypeString, NoRender: true, Required: true},
			{Name: "language", Type: TypeString, Render: "data-language"},
			{Name: "process", Type: TypeBoolean, NoRender: true, Default: true},
		},
		Transform: func(node *Node, config *Config) (any, error) {
			if len(node.Children) > 0 {
				return transformTag(renderName(node, config, "pre"), node, config, nil)
			}
			return transformTag(renderName(node, config, "pre"), node, config, []any{attributeOrUndefined(node, "content")})
		},
	},
	"blockquote": {Render: "blockquote", Children: blockChildren},
	"item":       {Render: "li", Children: append([]string{"inline"}, blockChildren...)},
	"list": {
		Children: []string{"item"},
		Attributes: []SchemaAttribute{
			{Name: "ordered", Type: TypeBoolean, NoRender: true, Required: true},
			{Name: "start", Type: TypeNumber},
			{Name: "marker", Type: TypeString, NoRender: true},
		},
		Transform: func(node *Node, config *Config) (any, error) {
			name := "ul"
			if js.Truthy(node.Attributes.Get("ordered")) {
				name = "ol"
			}
			return transformTag(name, node, config, nil)
		},
	},
	"hr":    {Render: "hr"},
	"table": {Render: "table"},
	"td": {
		Render:   "td",
		Children: append([]string{"inline"}, blockChildren...),
		Attributes: []SchemaAttribute{
			{Name: "align", Type: TypeString},
			{Name: "colspan", Type: TypeNumber, Render: "colSpan"},
			{Name: "rowspan", Type: TypeNumber, Render: "rowSpan"},
		},
	},
	"th": {
		Render: "th",
		Attributes: []SchemaAttribute{
			{Name: "width", Type: TypeString},
			{Name: "align", Type: TypeString},
			{Name: "colspan", Type: TypeNumber, Render: "colSpan"},
			{Name: "rowspan", Type: TypeNumber, Render: "rowSpan"},
		},
	},
	"tr":    {Render: "tr", Children: []string{"th", "td"}},
	"tbody": {Render: "tbody", Children: []string{"tr", "tag"}},
	"thead": {Render: "thead", Children: []string{"tr"}},
	"strong": {
		Render:     "strong",
		Children:   []string{"em", "s", "link", "code", "text", "tag"},
		Attributes: []SchemaAttribute{{Name: "marker", Type: TypeString, NoRender: true}},
	},
	"em": {
		Render:     "em",
		Children:   []string{"strong", "s", "link", "code", "text", "tag"},
		Attributes: []SchemaAttribute{{Name: "marker", Type: TypeString, NoRender: true}},
	},
	"s": {Render: "s", Children: []string{"strong", "em", "link", "code", "text", "tag"}},
	"inline": {
		Children: []string{"strong", "em", "s", "code", "text", "tag", "link", "image", "hardbreak", "softbreak", "comment"},
	},
	"link": {
		Render:   "a",
		Children: []string{"strong", "em", "s", "code", "text", "tag"},
		Attributes: []SchemaAttribute{
			{Name: "href", Type: TypeString, Required: true},
			{Name: "title", Type: TypeString},
		},
	},
	"code": {
		Render:     "code",
		Attributes: []SchemaAttribute{{Name: "content", Type: TypeString, NoRender: true, Required: true}},
		Transform: func(node *Node, config *Config) (any, error) {
			return transformTag(renderName(node, config, "code"), node, config, []any{attributeOrUndefined(node, "content")})
		},
	},
	"text": {
		Attributes: []SchemaAttribute{{Name: "content", Type: TypeString, Required: true}},
		Transform: func(node *Node, _ *Config) (any, error) {
			return attributeOrUndefined(node, "content"), nil
		},
	},
	"hardbreak": {Render: "br"},
	"softbreak": {
		Transform: func(*Node, *Config) (any, error) { return " ", nil },
	},
	"comment": {Attributes: []SchemaAttribute{{Name: "content", Type: TypeString, Required: true}}},
	"error":   {},
	"node":    {},
}

// transformTag returns a Tag with the node's transformed attributes, and
// either children or, if children is nil, the node's transformed children.
func transformTag(name string, node *Node, config *Config, children []any) (any, error) {
	attributes, err := node.TransformAttributes(config)
	if err != nil {
		return nil, err
	}
	if children == nil {
		if children, err = node.TransformChildren(config); err != nil {
			return nil, err
		}
	}
	return NewTag(name, attributes, children), nil
}

// renderName is the node's schema's Render, or fallback if it has none,
// like `this.render ?? fallback` in a JS schema's transform.
func renderName(node *Node, config *Config, fallback string) string {
	if s := node.FindSchema(config); s != nil && s.Render != "" {
		return s.Render
	}
	return fallback
}

// attributeOrUndefined returns an attribute's value, or Undefined if the
// node doesn't have it.
func attributeOrUndefined(node *Node, name string) any {
	if node.Attributes.Has(name) {
		return node.Attributes.Get(name)
	}
	return Undefined
}

// classType is the Class schema type of the global class attribute.
type classType struct{}

func (classType) TypeName() string { return "Class" }

func (classType) Validate(value any, _ *Config, key string) []ValidationError {
	if _, ok := value.(string); ok || isObject(value) {
		return nil
	}
	return []ValidationError{{
		ID: "attribute-type-invalid", Level: LevelError,
		Message: "Attribute '" + key + "' must be type 'string | object'",
	}}
}

func (classType) Transform(value any, _ *Config) any {
	if _, ok := value.(string); ok || !js.Truthy(value) {
		return value
	}
	var classes []string
	keys, values := objectEntries(value)
	for i, k := range keys {
		if js.Truthy(values[i]) {
			classes = append(classes, k)
		}
	}
	return strings.Join(classes, " ")
}

// idType is the Id schema type of the global id attribute.
type idType struct{}

func (idType) TypeName() string { return "Id" }

func (idType) Validate(value any, _ *Config, _ string) []ValidationError {
	if s, ok := value.(string); ok && s != "" && js.IsASCIILetter(s[0]) {
		return nil
	}
	return []ValidationError{{
		ID: "attribute-value-invalid", Level: LevelError,
		Message: "The 'id' attribute must start with a letter",
	}}
}

// conditionalType is the attribute type of the `if` and `else` tags'
// primary attribute.
type conditionalType struct{}

func (conditionalType) TypeName() string { return "ConditionalAttributeType" }

func (conditionalType) Validate(value any, _ *Config, key string) []ValidationError {
	if _, ok := value.(bool); ok || js.IsNullish(value) || isObject(value) {
		return nil
	}
	return []ValidationError{{
		ID: "attribute-type-invalid", Level: LevelError,
		Message: "Attribute '" + key + "' must be type 'boolean | object' (null or undefined are also allowed)",
	}}
}
