package markdoc

import "regexp"

// Config holds the schemas, variables, functions and partials that Resolve,
// Transform and Validate use, mirroring the JS Config. A nil *Config is the
// same as an empty one.
type Config struct {
	// Nodes maps node types, such as "paragraph", to their schemas.
	Nodes map[string]*Schema
	// Tags maps tag names to their schemas.
	Tags map[string]*Schema
	// Variables holds the values that `$name` references resolve to. Values
	// can be Go maps, slices and structs as well as JS-like values.
	Variables map[string]any
	// VariableFunc, if set, resolves every variable reference instead of
	// Variables, as when JS config.variables is a function.
	VariableFunc func(path []any) any
	// Functions maps function names to their definitions.
	Functions map[string]*ConfigFunction
	// Partials maps file names to the documents the `partial` tag includes.
	Partials map[string]*Node
	// Validation holds options for Validate.
	Validation ValidationConfig
}

// ValidationConfig holds options for Validate.
type ValidationConfig struct {
	// Parents are the ancestors of the node being validated, outermost
	// first. Validate sets it for each node it passes to a Validate hook.
	Parents []*Node
	// ValidateFunctions checks function calls against Functions.
	ValidateFunctions bool
	// Environment is free for Validate hooks to use.
	Environment string
}

// Schema describes how a node or tag is validated and transformed.
type Schema struct {
	// Render is the name of the Tag the node becomes. If it is empty and
	// there is no Transform, the node is replaced by its children.
	Render string
	// Children lists the node types allowed as children. Nil allows all.
	Children []string
	// Attributes are the attributes the node accepts, in render order.
	Attributes []SchemaAttribute
	// Slots are the slots the node accepts.
	Slots []SchemaSlot
	// SelfClosing reports that the tag must not have children.
	SelfClosing bool
	// Inline, if set, requires the tag to be inline (true) or block (false).
	Inline *bool
	// Transform, if set, replaces the default transform. It returns a *Tag,
	// a scalar, nil, or []any of those.
	Transform func(node *Node, config *Config) (any, error)
	// Validate, if set, adds errors after the built-in checks.
	Validate func(node *Node, config *Config) []ValidationError
	// Description documents the schema.
	Description string
}

// SchemaAttribute describes one attribute of a Schema or one parameter of a
// ConfigFunction.
type SchemaAttribute struct {
	// Name is the attribute's name. Function parameters use their position,
	// such as "0", or their name.
	Name string
	// Type is the type values must have. Nil allows any value.
	Type AttributeType
	// Render is the name the attribute is rendered with. Empty means Name.
	Render string
	// NoRender leaves the attribute out of the rendered Tag.
	NoRender bool
	// Default is used when the attribute is missing or Undefined. Nil means
	// no default.
	Default any
	// Required reports an error when the attribute is missing.
	Required bool
	// Matches restricts the attribute's values.
	Matches Matcher
	// Validate, if set, adds errors for the attribute's value.
	Validate func(value any, config *Config, name string) []ValidationError
	// ErrorLevel is the level of type and Matches errors. Empty means
	// LevelError.
	ErrorLevel Level
	// Description documents the attribute.
	Description string
}

// SchemaSlot describes one slot of a Schema.
type SchemaSlot struct {
	Name string
	// Render is the attribute name the slot is rendered as. Empty means Name.
	Render string
	// NoRender leaves the slot out of the rendered Tag.
	NoRender bool
	// Required reports an error when the slot is missing.
	Required bool
}

// ConfigFunction defines a function that can be called from a document,
// such as `equals($a, 1)`.
type ConfigFunction struct {
	// Returns is the type the function returns, checked against attribute
	// types when ValidationConfig.ValidateFunctions is set.
	Returns AttributeType
	// Parameters are the parameters the function accepts.
	Parameters []SchemaAttribute
	// Transform computes the function's value from its resolved parameters.
	// Without it the function resolves to Undefined.
	Transform func(parameters *OrderedMap, config *Config) (any, error)
	// Validate, if set, adds errors for a call.
	Validate func(fn *Function, config *Config) []ValidationError
}

// AttributeType is the type of an attribute's values. The built-in types
// are TypeString, TypeNumber, TypeBoolean, TypeObject and TypeArray; Union
// combines types. A custom type implements AttributeValidator, to check
// values, and AttributeTransformer, to change them before rendering.
type AttributeType interface {
	// TypeName is used in error messages.
	TypeName() string
}

// AttributeValidator is implemented by custom attribute types that check
// values.
type AttributeValidator interface {
	Validate(value any, config *Config, name string) []ValidationError
}

// AttributeTransformer is implemented by custom attribute types that change
// values before they are rendered.
type AttributeTransformer interface {
	Transform(value any, config *Config) any
}

type primitiveType string

func (t primitiveType) TypeName() string { return string(t) }

// The built-in attribute types.
var (
	TypeString  AttributeType = primitiveType("String")
	TypeNumber  AttributeType = primitiveType("Number")
	TypeBoolean AttributeType = primitiveType("Boolean")
	TypeObject  AttributeType = primitiveType("Object")
	TypeArray   AttributeType = primitiveType("Array")
)

type unionType struct{ types []AttributeType }

func (u *unionType) TypeName() string {
	s := ""
	for i, t := range u.types {
		if i > 0 {
			s += " | "
		}
		s += t.TypeName()
	}
	return s
}

// Union returns a type that accepts values of any of types, like a JS
// array of types.
func Union(types ...AttributeType) AttributeType {
	return &unionType{types: append([]AttributeType{}, types...)}
}

// Matcher restricts an attribute's values. Use MatchList, MatchRegexp or
// MatchFunc.
type Matcher interface{ matcher() }

type matchList []any
type matchRegexp struct{ re *regexp.Regexp }
type matchFunc func(*Config) Matcher

func (matchList) matcher()   {}
func (matchRegexp) matcher() {}
func (matchFunc) matcher()   {}

// MatchList accepts only the given values.
func MatchList(values ...any) Matcher { return matchList(values) }

// MatchRegexp accepts only values whose string form matches re.
func MatchRegexp(re *regexp.Regexp) Matcher { return matchRegexp{re} }

// MatchFunc computes the Matcher from the config when validating. It may
// return nil to accept every value.
func MatchFunc(f func(*Config) Matcher) Matcher { return matchFunc(f) }

// mergeConfig adds the built-in nodes, tags and functions to a config, as
// the JS mergeConfig does.
func mergeConfig(c *Config) *Config {
	out := &Config{}
	if c != nil {
		*out = *c
	}
	out.Tags = mergeMaps(Tags, out.Tags)
	out.Nodes = mergeMaps(Nodes, out.Nodes)
	out.Functions = mergeMaps(Functions, out.Functions)
	return out
}

func mergeMaps[V any](base, over map[string]V) map[string]V {
	out := make(map[string]V, len(base)+len(over))
	for k, v := range base {
		out[k] = v
	}
	for k, v := range over {
		out[k] = v
	}
	return out
}

// mergedAttributes returns the global attributes followed by the schema's,
// as JS {...globalAttributes, ...schema.attributes}.
func mergedAttributes(schema *Schema) []SchemaAttribute {
	if schema == nil {
		return orderAttributes(GlobalAttributes)
	}
	return orderAttributes(GlobalAttributes, schema.Attributes)
}

// orderAttributes merges attribute lists the way JS spreads objects: a
// later attribute replaces an earlier one of the same name in place, and
// integer-like names come first.
func orderAttributes(lists ...[]SchemaAttribute) []SchemaAttribute {
	order := NewOrderedMap()
	for _, list := range lists {
		for _, a := range list {
			order.Set(a.Name, a)
		}
	}
	out := make([]SchemaAttribute, 0, order.Len())
	for _, k := range order.Keys() {
		out = append(out, order.Get(k).(SchemaAttribute))
	}
	return out
}

// lookupAttribute finds an attribute by name in a list.
func lookupAttribute(attrs []SchemaAttribute, name string) (SchemaAttribute, bool) {
	for _, a := range attrs {
		if a.Name == name {
			return a, true
		}
	}
	return SchemaAttribute{}, false
}
