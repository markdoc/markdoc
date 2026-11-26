package markdoc

// The Go versions of the hooks in scripts/hooks.mjs, which config fixtures
// refer to with {$hook: name}.

import (
	"strings"

	"markdoc.dev/markdoc/internal/js"
)

type linkType struct{}

func (linkType) TypeName() string { return "Link" }

func (linkType) Validate(value any, _ *Config, _ string) []ValidationError {
	if s, ok := value.(string); ok && strings.HasPrefix(s, "http") {
		return nil
	}
	return []ValidationError{{
		ID: "attribute-type-invalid", Level: LevelError,
		Message: "Attribute 'href' must be type of 'Link'",
	}}
}

type bazLessThanFiveType struct{}

func (bazLessThanFiveType) TypeName() string { return "BazLessThanFive" }

func (bazLessThanFiveType) Validate(value any, config *Config, name string) []ValidationError {
	return bazLessThanFive(value, config, name)
}

func bazLessThanFive(value any, _ *Config, name string) []ValidationError {
	baz, _ := getProperty(value, "baz")
	if n, ok := js.ToNumber(baz); ok && n < 5 {
		return []ValidationError{{
			ID: "invalid-foo-bar", Level: LevelError,
			Message: "The value of '" + name + ".baz' must be less than five",
		}}
	}
	return nil
}

type upperCaseStringType struct{}

func (upperCaseStringType) TypeName() string { return "UpperCaseString" }

func (upperCaseStringType) Transform(value any, _ *Config) any {
	if s, ok := value.(string); ok {
		return strings.ToUpper(s)
	}
	return value
}

type nonNullStringType struct{}

func (nonNullStringType) TypeName() string { return "NonNullString" }

func (nonNullStringType) Transform(value any, _ *Config) any {
	if !js.Truthy(value) {
		return ""
	}
	return value
}

// jsAdd is JS a + b for numbers and strings.
func jsAdd(a, b any) any {
	x, xok := js.ToNumber(a)
	y, yok := js.ToNumber(b)
	if xok && yok {
		return x + y
	}
	return js.ToString(a) + js.ToString(b)
}

func testHooks() map[string]any {
	return map[string]any{
		// Attribute types
		"Link":            linkType{},
		"BazLessThanFive": bazLessThanFiveType{},
		"UpperCaseString": upperCaseStringType{},
		"NonNullString":   nonNullStringType{},

		// Attribute validate functions
		"greaterThanTen": func(value any, _ *Config, _ string) []ValidationError {
			if n, ok := js.ToNumber(value); ok && n > 10 {
				return nil
			}
			return []ValidationError{{
				ID:      "attribute-should-be-greater-than-ten",
				Message: `Attribute "bar" must have value greater than 10.`,
			}}
		},
		"bazLessThanFive": bazLessThanFive,

		// Schema validate functions
		"headingInFoo": func(_ *Node, config *Config) []ValidationError {
			for _, p := range config.Validation.Parents {
				if p.Tag == "foo" {
					return []ValidationError{{
						ID: "heading-in-foo", Level: LevelError,
						Message: "Can't nest a heading in tag 'foo'",
					}}
				}
			}
			return nil
		},
		"parents": func(_ *Node, config *Config) []ValidationError {
			names := []string{}
			for _, p := range config.Validation.Parents {
				if p.Tag != "" {
					names = append(names, p.Tag)
				} else {
					names = append(names, p.Type)
				}
			}
			return []ValidationError{{ID: "parents", Level: LevelInfo, Message: strings.Join(names, " > ")}}
		},
		"located": func(*Node, *Config) []ValidationError {
			return []ValidationError{{
				ID: "located", Level: LevelWarning, Message: "Located",
				Location: &Location{
					Start: LocationEdge{Line: intp(10), Character: intp(2)},
					End:   LocationEdge{Line: intp(11)},
				},
				HasLocation: true,
			}}
		},
		"locatedInFile": func(*Node, *Config) []ValidationError {
			return []ValidationError{{
				ID: "located", Level: LevelWarning, Message: "Located in another file",
				Location: &Location{
					File:  "other.md",
					Start: LocationEdge{Line: intp(1)},
					End:   LocationEdge{Line: intp(2)},
				},
				HasLocation: true,
			}}
		},

		// Function transforms and validators
		"upper": func(p *OrderedMap, _ *Config) (any, error) {
			return strings.ToUpper(js.ToString(attributeValue(p, "0"))), nil
		},
		"sum": func(p *OrderedMap, _ *Config) (any, error) {
			var total any = 0.0
			_, values := objectEntries(p)
			for _, v := range values {
				total = jsAdd(total, v)
			}
			return total, nil
		},
		"keys": func(p *OrderedMap, _ *Config) (any, error) {
			return strings.Join(p.Keys(), ","), nil
		},
		"echo": func(p *OrderedMap, _ *Config) (any, error) { return p, nil },
		"requireX": func(fn *Function, _ *Config) []ValidationError {
			if fn.Parameters.Has("x") {
				return nil
			}
			return []ValidationError{{ID: "needs-x", Level: LevelWarning, Message: "'" + fn.Name + "' needs x"}}
		},

		// Schema transforms
		"section": func(node *Node, config *Config) (any, error) {
			attributes, err := node.TransformAttributes(config)
			if err != nil {
				return nil, err
			}
			attributes.Set("data-count", float64(len(node.Children)))
			children, err := node.TransformChildren(config)
			if err != nil {
				return nil, err
			}
			return NewTag("section", attributes, children), nil
		},
		"spread": func(node *Node, config *Config) (any, error) {
			children, err := node.TransformChildren(config)
			if err != nil {
				return nil, err
			}
			out := append([]any{NewTag("hr", nil, nil)}, children...)
			return append(out, "tail"), nil
		},
		"nothing":         func(*Node, *Config) (any, error) { return nil, nil },
		"undefinedResult": func(*Node, *Config) (any, error) { return Undefined, nil },
		"primary": func(node *Node, _ *Config) (any, error) {
			return attributeOrUndefined(node, "primary"), nil
		},
		"attributesOnly": func(node *Node, config *Config) (any, error) {
			attributes, err := node.TransformAttributes(config)
			if err != nil {
				return nil, err
			}
			out := NewOrderedMap()
			out.Set("name", "foo")
			out.Set("attributes", attributes)
			return out, nil
		},
	}
}
