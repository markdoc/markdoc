package markdoc

import "markdoc.dev/markdoc/internal/js"

// A port of packages/markdoc/src/tags/ and functions/.

// Tags are the built-in tag schemas: if, else, partial, slot and table.
var Tags = map[string]*Schema{
	"if": {
		Attributes: []SchemaAttribute{{Name: "primary", Type: conditionalType{}, NoRender: true}},
		Transform:  transformIf,
	},
	"else": {
		SelfClosing: true,
		Attributes:  []SchemaAttribute{{Name: "primary", Type: conditionalType{}, NoRender: true}},
	},
	"partial": {
		Inline:      new(false),
		SelfClosing: true,
		Attributes: []SchemaAttribute{
			{Name: "file", Type: partialFileType{}, NoRender: true, Required: true},
			{Name: "variables", Type: TypeObject, NoRender: true},
		},
		Transform: transformPartial,
	},
	"slot": {
		Attributes: []SchemaAttribute{{Name: "primary", Type: TypeString, Required: true}},
	},
	"table": {
		Children: []string{"table"},
		Inline:   new(false),
	},
}

type condition struct {
	condition any
	children  []*Node
}

// transformIf renders the children of the first true branch of an `if` tag
// and its `else` tags.
func transformIf(node *Node, config *Config) (any, error) {
	conditions := []condition{{condition: attributeOrUndefined(node, "primary")}}
	for _, child := range node.Children {
		if child.Type == "tag" && child.Tag == "else" {
			var c any = true
			if child.Attributes.Has("primary") {
				c = child.Attributes.Get("primary")
			}
			conditions = append(conditions, condition{condition: c})
		} else {
			last := &conditions[len(conditions)-1]
			last.children = append(last.children, child)
		}
	}
	for _, c := range conditions {
		if Truthy(c.condition) {
			return transformNodes(c.children, config)
		}
	}
	return []any{}, nil
}

// partialFileType checks that the `partial` tag's file is in the config.
type partialFileType struct{}

func (partialFileType) TypeName() string { return "PartialFile" }

func (partialFileType) Validate(value any, config *Config, _ string) []ValidationError {
	if config != nil && config.Partials[js.ToString(value)] != nil {
		return nil
	}
	return []ValidationError{{
		ID: "attribute-value-invalid", Level: LevelError,
		Message: "Partial `" + js.ToString(value) + "` not found. The 'file' attribute must be set in `config.partials`",
	}}
}

// transformPartial renders the partial named by the file attribute, with
// its variables added to the config's.
func transformPartial(node *Node, config *Config) (any, error) {
	file := attributeOrUndefined(node, "file")
	var partial *Node
	if config != nil {
		partial = config.Partials[js.ToString(file)]
	}
	if partial == nil {
		return nil, nil
	}

	scoped := Config{}
	if config != nil {
		scoped = *config
	}
	// As in JS, where spreading a variables function adds nothing.
	scoped.VariableFunc = nil
	scoped.Variables = map[string]any{}
	if config != nil {
		for k, v := range config.Variables {
			scoped.Variables[k] = v
		}
	}
	if variables := node.Attributes.Get("variables"); isObject(variables) {
		keys, values := objectEntries(variables)
		for i, k := range keys {
			scoped.Variables[k] = values[i]
		}
	}
	scoped.Variables["$$partial:filename"] = file

	resolved, err := partial.Resolve(&scoped)
	if err != nil {
		return nil, err
	}
	return resolved.TransformChildren(&scoped)
}

// Functions are the built-in functions: and, or, not, equals, default and
// debug.
var Functions = map[string]*ConfigFunction{
	"and": {Transform: func(p *OrderedMap, _ *Config) (any, error) {
		_, values := objectEntries(p)
		for _, v := range values {
			if !Truthy(v) {
				return false, nil
			}
		}
		return true, nil
	}},
	"or": {Transform: func(p *OrderedMap, _ *Config) (any, error) {
		_, values := objectEntries(p)
		for _, v := range values {
			if Truthy(v) {
				return true, nil
			}
		}
		return false, nil
	}},
	"not": {
		Parameters: []SchemaAttribute{{Name: "0", Required: true}},
		Transform: func(p *OrderedMap, _ *Config) (any, error) {
			return !Truthy(p.Get("0")), nil
		},
	},
	"equals": {Transform: func(p *OrderedMap, _ *Config) (any, error) {
		_, values := objectEntries(p)
		for _, v := range values {
			if !strictEquals(v, values[0]) {
				return false, nil
			}
		}
		return true, nil
	}},
	"default": {Transform: func(p *OrderedMap, _ *Config) (any, error) {
		var v any = Undefined
		if p.Has("0") {
			v = p.Get("0")
		}
		if js.IsUndefined(v) {
			if p.Has("1") {
				return p.Get("1"), nil
			}
			return Undefined, nil
		}
		return v, nil
	}},
	"debug": {Transform: func(p *OrderedMap, _ *Config) (any, error) {
		var v any = Undefined
		if p.Has("0") {
			v = p.Get("0")
		}
		s, ok, err := jsonStringify(v, "  ")
		if err != nil || !ok {
			return Undefined, err
		}
		return s, nil
	}},
}
