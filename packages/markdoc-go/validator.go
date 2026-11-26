package markdoc

// A port of packages/markdoc/src/validator.ts.

import (
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"markdoc.dev/markdoc/internal/js"
)

// ValidateError is a ValidationError found by Validate, with the node it
// belongs to.
type ValidateError struct {
	// Type is the node's type.
	Type string
	// Lines are the error's lines: its location's, if it has one, or else
	// the node's.
	Lines []int
	// Location is the error's location, if it has one, or else the node's.
	Location *Location
	Error    ValidationError
}

// MarshalJSON encodes the error as JSON.stringify encodes the JS object.
func (e ValidateError) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("type", e.Type)
	o.field("lines", e.Lines)
	if e.Location != nil {
		o.field("location", e.Location)
	}
	o.field("error", e.Error)
	return o.bytes()
}

// typeResult is what JS validateType returns: a boolean or a list of
// errors.
type typeResult struct {
	valid  bool
	errors []ValidationError
	isList bool
}

// ok reports whether the result is js.Truthy, as a list always is.
func (r typeResult) ok() bool { return r.valid || r.isList }

func validateType(t AttributeType, value any, config *Config, key string) typeResult {
	if t == nil {
		return typeResult{valid: true}
	}

	if fn, ok := value.(*Function); ok && config.Validation.ValidateFunctions {
		schema := config.Functions[fn.Name]
		if schema == nil || schema.Returns == nil {
			return typeResult{valid: true}
		}
		if u, ok := schema.Returns.(*unionType); ok {
			for _, r := range u.types {
				if sameType(r, t) {
					return typeResult{valid: true}
				}
			}
			return typeResult{}
		}
		return typeResult{valid: sameType(schema.Returns, t)}
	}

	if isAst(value) {
		return typeResult{valid: true}
	}

	switch t := t.(type) {
	case *unionType:
		for _, u := range t.types {
			if validateType(u, value, config, key).ok() {
				return typeResult{valid: true}
			}
		}
		return typeResult{}
	case primitiveType:
		return typeResult{valid: hasPrimitiveType(t, value)}
	case AttributeValidator:
		errs := t.Validate(value, config, key)
		if errs == nil {
			errs = []ValidationError{}
		}
		return typeResult{errors: errs, isList: true}
	}
	return typeResult{}
}

// hasPrimitiveType checks `value.constructor === type` for the built-in
// types.
func hasPrimitiveType(t primitiveType, value any) bool {
	switch t {
	case TypeString:
		_, ok := value.(string)
		return ok
	case TypeNumber:
		_, ok := js.ToNumber(value)
		return ok
	case TypeBoolean:
		_, ok := value.(bool)
		return ok
	case TypeArray:
		_, ok := js.AsArray(value)
		return ok
	case TypeObject:
		switch value.(type) {
		case *OrderedMap, map[string]any:
			return true
		}
		rv := reflect.ValueOf(value)
		return rv.Kind() == reflect.Map || rv.Kind() == reflect.Struct
	}
	return false
}

// sameType compares attribute types by identity, as JS === does.
func sameType(a, b AttributeType) bool {
	ta, tb := reflect.TypeOf(a), reflect.TypeOf(b)
	return ta == tb && ta != nil && ta.Comparable() && a == b
}

func isAst(v any) bool {
	switch v.(type) {
	case *Node, *Variable, *Function:
		return true
	}
	return false
}

func validateFunction(fn *Function, config *Config) []ValidationError {
	schema := config.Functions[fn.Name]
	errors := []ValidationError{}

	if schema == nil {
		return []ValidationError{{
			ID: "function-undefined", Level: LevelCritical,
			Message: "Undefined function: '" + fn.Name + "'",
		}}
	}

	if schema.Validate != nil {
		errors = append(errors, schema.Validate(fn, config)...)
	}

	params := orderAttributes(schema.Parameters)
	if schema.Parameters != nil {
		keys, values := objectEntries(fn.Parameters)
		for i, key := range keys {
			value := values[i]
			param, ok := lookupAttribute(params, key)
			if !ok {
				errors = append(errors, ValidationError{
					ID: "parameter-undefined", Level: LevelError,
					Message: "Invalid parameter: '" + key + "'",
				})
				continue
			}

			if _, isFn := value.(*Function); isAst(value) && !isFn {
				continue
			}

			if param.Type != nil {
				valid := validateType(param.Type, value, config, key)
				if !valid.ok() {
					errors = append(errors, ValidationError{
						ID: "parameter-type-invalid", Level: LevelError,
						Message: "Parameter '" + key + "' of '" + fn.Name + "' must be type of '" + param.Type.TypeName() + "'",
					})
				} else if valid.isList {
					errors = append(errors, valid.errors...)
				}
			}
		}
	}

	for _, param := range params {
		if param.Required && js.IsUndefined(attributeValue(fn.Parameters, param.Name)) {
			errors = append(errors, ValidationError{
				ID: "parameter-missing-required", Level: LevelError,
				Message: "Missing required parameter: '" + param.Name + "'",
			})
		}
	}

	return errors
}

// attributeValue returns a key's value, or Undefined if it isn't set.
func attributeValue(m *OrderedMap, key string) any {
	if m.Has(key) {
		return m.Get(key)
	}
	return Undefined
}

func displayMatches(matches []any, n int) string {
	if len(matches) <= n {
		s, _, _ := jsonStringify(matches, "")
		return s
	}
	items := make([]string, n)
	for i, item := range matches[:n] {
		items[i], _, _ = jsonStringify(item, "")
	}
	return "[" + strings.Join(items, ",") + ", ... " + strconv.Itoa(len(matches)-n) + " more]"
}

// leadingFlags matches a flag group at the start of a pattern, which is
// how Go writes what JS calls a regular expression's flags.
var leadingFlags = regexp.MustCompile(`^\(\?([ims]+)\)`)

// regexpString formats a regular expression as JS `${regexp}` does, with a
// leading flag group such as (?i) written as JS flags.
func regexpString(re *regexp.Regexp) string {
	var b strings.Builder
	b.WriteByte('/')
	src, flags := re.String(), ""
	if m := leadingFlags.FindStringSubmatch(src); m != nil {
		src = src[len(m[0]):]
		for _, f := range "ims" {
			if strings.ContainsRune(m[1], f) {
				flags += string(f)
			}
		}
	}
	escaped := false
	for i := 0; i < len(src); i++ {
		c := src[i]
		if c == '/' && !escaped {
			b.WriteByte('\\')
		}
		escaped = c == '\\' && !escaped
		b.WriteByte(c)
	}
	b.WriteByte('/')
	b.WriteString(flags)
	return b.String()
}

func includes(list []any, value any) bool {
	for _, x := range list {
		if sameValueZero(x, value) {
			return true
		}
	}
	return false
}

// validateNode returns the errors for one node, without its descendants.
func validateNode(node *Node, config *Config) []ValidationError {
	schema := node.FindSchema(config)
	errors := append([]ValidationError{}, node.Errors...)

	if schema == nil {
		if node.Tag != "" {
			errors = append(errors, ValidationError{
				ID: "tag-undefined", Level: LevelCritical,
				Message: "Undefined tag: '" + node.Tag + "'",
			})
		} else {
			errors = append(errors, ValidationError{
				ID: "node-undefined", Level: LevelCritical,
				Message: "Undefined node: '" + node.Type + "'",
			})
		}
		return errors
	}

	if schema.Inline != nil && node.Inline != *schema.Inline {
		placement := "block"
		if *schema.Inline {
			placement = "inline"
		}
		errors = append(errors, ValidationError{
			ID: "tag-placement-invalid", Level: LevelCritical,
			Message: "'" + node.Tag + "' tag should be " + placement,
		})
	}

	if schema.SelfClosing && len(node.Children) > 0 {
		errors = append(errors, ValidationError{
			ID: "tag-selfclosing-has-children", Level: LevelCritical,
			Message: "'" + node.Tag + "' tag should be self-closing",
		})
	}

	attributes := mergedAttributes(schema)

	for _, key := range node.Slots.Keys() {
		if !hasSlot(schema, key) {
			errors = append(errors, ValidationError{
				ID: "slot-undefined", Level: LevelError,
				Message: "Invalid slot: '" + key + "'",
			})
		}
	}

	for _, key := range node.Attributes.Keys() {
		value := node.Attributes.Get(key)
		attrib, ok := lookupAttribute(attributes, key)
		if !ok {
			errors = append(errors, ValidationError{
				ID: "attribute-undefined", Level: LevelError,
				Message: "Invalid attribute: '" + key + "'",
			})
			continue
		}

		level := attrib.ErrorLevel
		if level == "" {
			level = LevelError
		}

		if isAst(value) {
			fn, isFn := value.(*Function)
			variable, isVar := value.(*Variable)
			switch {
			case isFn && config.Validation.ValidateFunctions:
				errors = append(errors, validateFunction(fn, config)...)
			case isVar && config.Variables != nil:
				if !hasVariable(config.Variables, variable.Path) {
					errors = append(errors, ValidationError{
						ID: "variable-undefined", Level: LevelError,
						Message: "Undefined variable: '" + joinPath(variable.Path) + "'",
					})
				}
			default:
				continue
			}
		}

		if attrib.Type != nil {
			valid := validateType(attrib.Type, value, config, key)
			if !valid.ok() {
				errors = append(errors, ValidationError{
					ID: "attribute-type-invalid", Level: level,
					Message: "Attribute '" + key + "' must be type of '" + attrib.Type.TypeName() + "'",
				})
			}
			if valid.isList {
				errors = append(errors, valid.errors...)
			}
		}

		matches := attrib.Matches
		if f, ok := matches.(matchFunc); ok {
			matches = f(config)
		}

		switch m := matches.(type) {
		case matchList:
			if !includes(m, value) {
				errors = append(errors, ValidationError{
					ID: "attribute-value-invalid", Level: level,
					Message: "Attribute '" + key + "' must match one of " + displayMatches(m, 8) + ". Got '" + js.ToString(value) + "' instead.",
				})
			}
		case matchRegexp:
			if !m.re.MatchString(js.ToString(value)) {
				errors = append(errors, ValidationError{
					ID: "attribute-value-invalid", Level: level,
					Message: "Attribute '" + key + "' must match " + regexpString(m.re) + ". Got '" + js.ToString(value) + "' instead.",
				})
			}
		}

		if attrib.Validate != nil {
			errors = append(errors, attrib.Validate(value, config, key)...)
		}
	}

	for _, attr := range attributes {
		if attr.Required && js.IsUndefined(attributeValue(node.Attributes, attr.Name)) {
			errors = append(errors, ValidationError{
				ID: "attribute-missing-required", Level: LevelError,
				Message: "Missing required attribute: '" + attr.Name + "'",
			})
		}
	}

	for _, slot := range schema.Slots {
		if slot.Required && !node.Slots.Has(slot.Name) {
			errors = append(errors, ValidationError{
				ID: "slot-missing-required", Level: LevelError,
				Message: "Missing required slot: '" + slot.Name + "'",
			})
		}
	}

	if schema.Children != nil {
		name := node.Tag
		if name == "" {
			name = node.Type
		}
		for _, child := range node.Children {
			if child.Type != "error" && !contains(schema.Children, child.Type) {
				errors = append(errors, ValidationError{
					ID: "child-invalid", Level: LevelWarning,
					Message: "Can't nest '" + child.Type + "' in '" + name + "'",
				})
			}
		}
	}

	if schema.Validate != nil {
		errors = append(errors, schema.Validate(node, config)...)
	}

	return errors
}

func hasSlot(schema *Schema, name string) bool {
	for _, s := range schema.Slots {
		if s.Name == name {
			return true
		}
	}
	return false
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// hasVariable walks a variable's path through the config's variables,
// checking that each step is an own property.
func hasVariable(variables map[string]any, path []any) bool {
	var obj any = variables
	for _, key := range path {
		v, found := getProperty(obj, key)
		if !found {
			return false
		}
		obj = v
	}
	return true
}

func joinPath(path []any) string {
	parts := make([]string, len(path))
	for i, p := range path {
		parts[i] = js.ToString(p)
	}
	return strings.Join(parts, ".")
}

func hasValidLocation(e ValidationError) bool {
	return e.HasLocation && e.Location != nil && e.Location.Start.Line != nil && e.Location.End.Line != nil
}

func toValidateError(node *Node, e ValidationError) ValidateError {
	if hasValidLocation(e) {
		loc := *e.Location
		if loc.File == "" && node.Location != nil {
			loc.File = node.Location.File
		}
		return ValidateError{
			Type:     node.Type,
			Lines:    []int{*e.Location.Start.Line, *e.Location.End.Line},
			Location: &loc,
			Error:    e,
		}
	}
	return ValidateError{Type: node.Type, Lines: node.Lines, Location: node.Location, Error: e}
}

// validateTree validates every node depth first, slots before children,
// setting ValidationConfig.Parents for each.
func validateTree(content *Node, config *Config) []ValidateError {
	output := []ValidateError{}
	var walk func(node *Node, parents []*Node)
	walk = func(node *Node, parents []*Node) {
		updated := *config
		updated.Validation.Parents = parents
		for _, e := range validateNode(node, &updated) {
			output = append(output, toValidateError(node, e))
		}
		children := make([]*Node, 0, node.Slots.Len()+len(node.Children))
		for _, k := range node.Slots.Keys() {
			children = append(children, node.Slots.Get(k).(*Node))
		}
		children = append(children, node.Children...)
		next := append(append([]*Node{}, parents...), node)
		for _, child := range children {
			walk(child, next)
		}
	}
	walk(content, []*Node{})
	return output
}
