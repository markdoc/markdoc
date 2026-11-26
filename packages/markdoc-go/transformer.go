package markdoc

// A port of packages/markdoc/src/tag.ts, transformer.ts, ast/base.ts
// (resolve), ast/variable.ts, ast/function.ts and the transform, resolve and
// validate entry points in index.ts.

import (
	"fmt"

	"markdoc.dev/markdoc/internal/js"
)

// Tag is an element of the renderable tree that Transform produces,
// mirroring the JS Tag.
type Tag struct {
	// Name is the element or component name, such as "p".
	Name string
	// Attributes holds the rendered attributes in order.
	Attributes *OrderedMap
	// Children are *Tag values and scalars.
	Children []any
}

// NewTag returns a Tag, defaulting the name to "div" and attributes and
// children to empty values, as the JS constructor does.
func NewTag(name string, attributes *OrderedMap, children []any) *Tag {
	if name == "" {
		name = "div"
	}
	if attributes == nil {
		attributes = NewOrderedMap()
	}
	if children == nil {
		children = []any{}
	}
	return &Tag{Name: name, Attributes: attributes, Children: children}
}

// IsTag reports whether v is a *Tag.
func IsTag(v any) bool {
	t, ok := v.(*Tag)
	return ok && t != nil
}

// MarshalJSON encodes the tag as JSON.stringify encodes a JS Tag.
func (t *Tag) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("$$mdtype", "Tag")
	o.field("name", t.Name)
	if t.Attributes == nil {
		o.raw("attributes", []byte("{}"))
	} else {
		o.field("attributes", t.Attributes)
	}
	if t.Children == nil {
		o.raw("children", []byte("[]"))
	} else {
		o.field("children", t.Children)
	}
	return o.bytes()
}

// GlobalAttributes are the attributes every node and tag accepts.
var GlobalAttributes = []SchemaAttribute{
	{Name: "class", Type: classType{}},
	{Name: "id", Type: idType{}},
}

// FindSchema returns the schema for the node from the config: the tag's
// schema for tags, and the node type's otherwise.
func (n *Node) FindSchema(config *Config) *Schema {
	if config == nil {
		return nil
	}
	if n.Tag != "" {
		return config.Tags[n.Tag]
	}
	return config.Nodes[n.Type]
}

// TransformAttributes returns the node's attributes as they are rendered:
// renamed, transformed by custom types, with defaults and slots filled in.
func (n *Node) TransformAttributes(config *Config) (*OrderedMap, error) {
	schema := n.FindSchema(config)
	output := NewOrderedMap()

	for _, attr := range mergedAttributes(schema) {
		if attr.NoRender {
			continue
		}
		name := attr.Render
		if name == "" {
			name = attr.Name
		}
		var v any = Undefined
		if n.Attributes.Has(attr.Name) {
			v = n.Attributes.Get(attr.Name)
		}
		if _, isUnion := attr.Type.(*unionType); !isUnion {
			if t, ok := attr.Type.(AttributeTransformer); ok {
				v = t.Transform(v, config)
			}
		}
		if js.IsUndefined(v) && attr.Default != nil {
			v = attr.Default
		}
		if js.IsUndefined(v) {
			continue
		}
		output.Set(name, v)
	}

	if schema != nil {
		for _, slot := range schema.Slots {
			if slot.NoRender {
				continue
			}
			name := slot.Render
			if name == "" {
				name = slot.Name
			}
			if s, ok := n.Slots.Get(slot.Name).(*Node); ok && s != nil {
				v, err := s.Transform(config)
				if err != nil {
					return nil, err
				}
				output.Set(name, v)
			}
		}
	}
	return output, nil
}

// TransformChildren transforms the node's children. Children that
// transform to []any are spliced in, as JS flatMap does.
func (n *Node) TransformChildren(config *Config) ([]any, error) {
	return transformNodes(n.Children, config)
}

func transformNodes(nodes []*Node, config *Config) ([]any, error) {
	children := []any{}
	for _, child := range nodes {
		v, err := child.Transform(config)
		if err != nil {
			return nil, err
		}
		children = appendFlat(children, v)
	}
	return children, nil
}

// appendFlat appends v, or v's elements if it is an array.
func appendFlat(out []any, v any) []any {
	if items, ok := js.AsArray(v); ok {
		return append(out, items...)
	}
	return append(out, v)
}

// Transform transforms the node into a renderable tree with its schema's
// Transform, or else into a Tag named by its schema's Render. It does not
// resolve variables or add the built-in schemas; the Transform function
// does both.
func (n *Node) Transform(config *Config) (any, error) {
	schema := n.FindSchema(config)
	if schema != nil && schema.Transform != nil {
		return schema.Transform(n, config)
	}

	children, err := n.TransformChildren(config)
	if err != nil {
		return nil, err
	}
	if schema == nil || schema.Render == "" {
		return children, nil
	}

	attributes, err := n.TransformAttributes(config)
	if err != nil {
		return nil, err
	}
	return NewTag(schema.Render, attributes, children), nil
}

// Resolve returns a copy of the node with variables and functions in its
// attributes replaced by their values, recursively.
func (n *Node) Resolve(config *Config) (*Node, error) {
	out := *n
	out.Children = make([]*Node, len(n.Children))
	for i, child := range n.Children {
		c, err := child.Resolve(config)
		if err != nil {
			return nil, err
		}
		out.Children[i] = c
	}
	attributes, err := resolveValue(n.Attributes, config)
	if err != nil {
		return nil, err
	}
	out.Attributes = attributes.(*OrderedMap)
	out.Slots = NewOrderedMap()
	for _, k := range n.Slots.Keys() {
		s, err := n.Slots.Get(k).(*Node).Resolve(config)
		if err != nil {
			return nil, err
		}
		out.Slots.Set(k, s)
	}
	return &out, nil
}

// resolveValue resolves the variables and functions in a value.
func resolveValue(v any, config *Config) (any, error) {
	switch v := v.(type) {
	case *Node:
		return v.Resolve(config)
	case *Variable:
		return v.Resolve(config)
	case *Function:
		return v.Resolve(config)
	case []any:
		out := make([]any, len(v))
		for i, x := range v {
			r, err := resolveValue(x, config)
			if err != nil {
				return nil, err
			}
			out[i] = r
		}
		return out, nil
	case *OrderedMap:
		if v == nil {
			return NewOrderedMap(), nil
		}
		out := NewOrderedMap()
		for _, k := range v.Keys() {
			r, err := resolveValue(v.values[k], config)
			if err != nil {
				return nil, err
			}
			out.Set(k, r)
		}
		return out, nil
	case map[string]any:
		out := make(map[string]any, len(v))
		for k, x := range v {
			r, err := resolveValue(x, config)
			if err != nil {
				return nil, err
			}
			out[k] = r
		}
		return out, nil
	}
	return v, nil
}

// Resolve returns the variable's value: the result of
// Config.VariableFunc, or the value at its path in Config.Variables.
// Missing values are Undefined. Reading a property of nil is an error, as
// it is a TypeError in JS.
func (v *Variable) Resolve(config *Config) (any, error) {
	if config != nil && config.VariableFunc != nil {
		return config.VariableFunc(v.Path), nil
	}
	var obj any = Undefined
	if config != nil && config.Variables != nil {
		obj = config.Variables
	}
	for _, key := range v.Path {
		if js.IsUndefined(obj) {
			continue
		}
		if obj == nil {
			return nil, fmt.Errorf("TypeError: Cannot read properties of null (reading '%s')", js.ToString(key))
		}
		obj, _ = getProperty(obj, key)
	}
	return obj, nil
}

// Resolve calls the function's Transform with its resolved parameters. An
// undefined function resolves to nil, and one without a Transform to
// Undefined.
func (f *Function) Resolve(config *Config) (any, error) {
	var fn *ConfigFunction
	if config != nil {
		fn = config.Functions[f.Name]
	}
	if fn == nil {
		return nil, nil
	}
	params, err := resolveValue(f.Parameters, config)
	if err != nil {
		return nil, err
	}
	if fn.Transform == nil {
		return Undefined, nil
	}
	return fn.Transform(params.(*OrderedMap), config)
}

// Resolve returns a copy of the AST with every variable and function
// replaced by its value.
func Resolve(node *Node, config *Config) (*Node, error) {
	return node.Resolve(config)
}

// Transform resolves the AST and transforms it into a renderable tree,
// using the built-in nodes, tags and functions along with the config's.
func Transform(node *Node, config *Config) (any, error) {
	config = mergeConfig(config)
	resolved, err := node.Resolve(config)
	if err != nil {
		return nil, err
	}
	return resolved.Transform(config)
}

// Validate checks every node of the AST against its schema, using the
// built-in nodes, tags and functions along with the config's.
func Validate(node *Node, config *Config) []ValidateError {
	return validateTree(node, mergeConfig(config))
}

// Markdoc bundles a config with the functions that use it, mirroring the JS
// Markdoc class.
type Markdoc struct {
	Config *Config
}

// New returns a Markdoc that uses config.
func New(config *Config) *Markdoc { return &Markdoc{Config: config} }

// Parse parses Markdoc source into an AST.
func (m *Markdoc) Parse(content string, opts ...ParseOption) *Node {
	return Parse(content, opts...)
}

// Resolve resolves the AST with the Markdoc's config.
func (m *Markdoc) Resolve(node *Node) (*Node, error) { return Resolve(node, m.Config) }

// Transform transforms the AST with the Markdoc's config.
func (m *Markdoc) Transform(node *Node) (any, error) { return Transform(node, m.Config) }

// Validate validates the AST with the Markdoc's config.
func (m *Markdoc) Validate(node *Node) []ValidateError { return Validate(node, m.Config) }
