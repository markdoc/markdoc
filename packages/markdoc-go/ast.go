package markdoc

import (
	"bytes"
	"fmt"
	"math"
	"sort"
	"strconv"
	"unicode/utf8"
)

// Node is a node in a Markdoc AST, mirroring the JS Ast.Node. Its JSON
// encoding matches JSON.stringify of the JS node.
type Node struct {
	// Type is the node type, such as "paragraph", "heading" or "tag".
	Type string
	// Tag is the tag name for nodes of type "tag".
	Tag string
	// Attributes holds the node's attributes in JS key order.
	Attributes *OrderedMap
	// Children are the node's child nodes.
	Children []*Node
	// Errors are the syntax errors found while parsing the node.
	Errors []ValidationError
	// Lines are the zero-based source line ranges the node spans.
	Lines []int
	// Inline reports whether the node is part of inline content.
	Inline bool
	// Annotations are the attributes, classes and IDs set with `{% %}`.
	Annotations []AttributeValue
	// Slots maps slot names to *Node values, when parsed with Slots.
	Slots *OrderedMap
	// Location is the node's position in the source.
	Location *Location
}

// NewNode returns a node with empty, non-nil attributes, children, errors,
// lines, annotations and slots. Nil attributes or children are allowed.
func NewNode(typ string, attributes *OrderedMap, children []*Node, tag string) *Node {
	if attributes == nil {
		attributes = NewOrderedMap()
	}
	if children == nil {
		children = []*Node{}
	}
	return &Node{
		Type:        typ,
		Tag:         tag,
		Attributes:  attributes,
		Children:    children,
		Errors:      []ValidationError{},
		Lines:       []int{},
		Annotations: []AttributeValue{},
		Slots:       NewOrderedMap(),
	}
}

// Push appends a child node.
func (n *Node) Push(child *Node) { n.Children = append(n.Children, child) }

// Walk yields every descendant depth first, slots before children.
func (n *Node) Walk(fn func(*Node)) {
	var kids []*Node
	for _, k := range n.Slots.Keys() {
		kids = append(kids, n.Slots.Get(k).(*Node))
	}
	kids = append(kids, n.Children...)
	for _, c := range kids {
		fn(c)
		c.Walk(fn)
	}
}

// AttributeValue is an attribute, class or ID set on a node with `{% %}`.
type AttributeValue struct {
	// Type is "attribute" or "class".
	Type  string
	Name  string
	Value any
}

// Variable is a reference to a variable such as `$page.title`.
type Variable struct {
	// Path holds the segments of the reference: strings and float64 indexes.
	Path []any
}

// Function is a call to a function such as `equals($a, 1)`.
type Function struct {
	Name       string
	Parameters *OrderedMap
}

// ValidationError describes a problem found in a document.
type ValidationError struct {
	// ID identifies the kind of error, such as "missing-closing".
	ID string
	// Level is how serious the error is.
	Level Level
	// Message describes the error.
	Message string
	// Location is where the error occurred, if known.
	Location *Location
	// HasLocation records whether the location is set at all, as JS
	// distinguishes `location: null` from an absent location.
	HasLocation bool
}

// Level is the severity of a ValidationError.
type Level string

// Severity levels, from least to most serious.
const (
	LevelDebug    Level = "debug"
	LevelInfo     Level = "info"
	LevelWarning  Level = "warning"
	LevelError    Level = "error"
	LevelCritical Level = "critical"
)

// Location is a range in a source file.
type Location struct {
	File  string
	Start LocationEdge
	End   LocationEdge
}

// LocationEdge is one end of a Location. Each field is nil when JS leaves
// it undefined.
type LocationEdge struct {
	// Line is zero-based.
	Line *int
	// Character is a UTF-16 offset within the line.
	Character *int
	// Offset is a UTF-16 offset within the source.
	Offset *int
}

func intp(i int) *int { return &i }

// OrderedMap is a JS object: string keys in insertion order, except that
// integer-like keys come first in ascending order.
type OrderedMap struct {
	keys   []string
	values map[string]any
}

// NewOrderedMap returns an empty OrderedMap.
func NewOrderedMap() *OrderedMap { return &OrderedMap{values: map[string]any{}} }

// Set sets a key's value, adding the key if it is new.
func (m *OrderedMap) Set(k string, v any) {
	if _, ok := m.values[k]; !ok {
		m.keys = append(m.keys, k)
	}
	m.values[k] = v
}

// Get returns a key's value, or nil if the key is not set.
func (m *OrderedMap) Get(k string) any {
	if m == nil {
		return nil
	}
	return m.values[k]
}

// Has reports whether a key is set.
func (m *OrderedMap) Has(k string) bool {
	if m == nil {
		return false
	}
	_, ok := m.values[k]
	return ok
}

// Len returns the number of keys.
func (m *OrderedMap) Len() int {
	if m == nil {
		return 0
	}
	return len(m.keys)
}

// Keys returns the keys in JS property order: integer-like keys ascending,
// then other keys in insertion order.
func (m *OrderedMap) Keys() []string {
	if m == nil {
		return nil
	}
	var ints, strs []string
	for _, k := range m.keys {
		if isArrayIndex(k) {
			ints = append(ints, k)
		} else {
			strs = append(strs, k)
		}
	}
	sort.Slice(ints, func(i, j int) bool {
		a, _ := strconv.ParseUint(ints[i], 10, 32)
		b, _ := strconv.ParseUint(ints[j], 10, 32)
		return a < b
	})
	return append(ints, strs...)
}

func isArrayIndex(k string) bool {
	n, err := strconv.ParseUint(k, 10, 32)
	return err == nil && n < math.MaxUint32 && strconv.FormatUint(n, 10) == k
}

// JSON encoding matches JSON.stringify of the JS classes.

type jsonObject struct {
	buf   bytes.Buffer
	first bool
	err   error
}

func newJSONObject() *jsonObject {
	o := &jsonObject{first: true}
	o.buf.WriteByte('{')
	return o
}

// field writes a key and value. The first error is kept and returned by
// bytes, and later fields are skipped.
func (o *jsonObject) field(k string, v any) {
	if o.err != nil {
		return
	}
	vb, err := marshalJS(v)
	if err != nil {
		o.err = err
		return
	}
	o.raw(k, vb)
}

func (o *jsonObject) raw(k string, v []byte) {
	if !o.first {
		o.buf.WriteByte(',')
	}
	o.first = false
	o.buf.Write(jsonStringWTF8(k))
	o.buf.WriteByte(':')
	o.buf.Write(v)
}

// jsonStringWTF8 encodes a string as JSON.stringify would, writing
// WTF-8-encoded lone surrogates as \u escapes.
func jsonStringWTF8(s string) []byte {
	var b bytes.Buffer
	b.WriteByte('"')
	for i := 0; i < len(s); {
		if s[i] == 0xED && i+2 < len(s) && s[i+1] >= 0xA0 {
			u := uint16(s[i]&0x0F)<<12 | uint16(s[i+1]&0x3F)<<6 | uint16(s[i+2]&0x3F)
			fmt.Fprintf(&b, `\u%04x`, u)
			i += 3
			continue
		}
		r, size := utf8.DecodeRuneInString(s[i:])
		switch {
		case r == '"':
			b.WriteString(`\"`)
		case r == '\\':
			b.WriteString(`\\`)
		case r == '\n':
			b.WriteString(`\n`)
		case r == '\r':
			b.WriteString(`\r`)
		case r == '\t':
			b.WriteString(`\t`)
		case r == '\b':
			b.WriteString(`\b`)
		case r == '\f':
			b.WriteString(`\f`)
		case r < 0x20:
			fmt.Fprintf(&b, `\u%04x`, r)
		default:
			b.WriteString(s[i : i+size])
		}
		i += size
	}
	b.WriteByte('"')
	return b.Bytes()
}

func (o *jsonObject) bytes() ([]byte, error) {
	if o.err != nil {
		return nil, o.err
	}
	o.buf.WriteByte('}')
	return o.buf.Bytes(), nil
}

// MarshalJSON encodes the map as a JSON object in key order. Undefined
// values are left out, as JSON.stringify does.
func (m *OrderedMap) MarshalJSON() ([]byte, error) { return marshalJS(m) }

// MarshalJSON encodes the annotation as JSON.stringify encodes the JS object.
func (a AttributeValue) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("type", a.Type)
	o.field("name", a.Name)
	o.field("value", a.Value)
	return o.bytes()
}

// MarshalJSON encodes the node as JSON.stringify encodes a JS node.
func (n *Node) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("$$mdtype", "Node")
	o.field("errors", n.Errors)
	o.field("lines", n.Lines)
	o.field("inline", n.Inline)
	o.field("attributes", n.Attributes)
	o.field("children", n.Children)
	o.field("type", n.Type)
	if n.Tag != "" {
		o.field("tag", n.Tag)
	}
	o.field("annotations", n.Annotations)
	o.field("slots", n.Slots)
	if n.Location != nil {
		o.field("location", n.Location)
	}
	return o.bytes()
}

// MarshalJSON encodes the variable as JSON.stringify encodes a JS Variable.
func (v *Variable) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("$$mdtype", "Variable")
	o.field("path", v.Path)
	return o.bytes()
}

// MarshalJSON encodes the function as JSON.stringify encodes a JS Function.
func (f *Function) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	o.field("$$mdtype", "Function")
	o.field("name", f.Name)
	o.field("parameters", f.Parameters)
	return o.bytes()
}

// MarshalJSON encodes the error as JSON.stringify encodes the JS object.
func (e ValidationError) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	// JS errors from validate hooks may leave these out.
	if e.ID != "" {
		o.field("id", e.ID)
	}
	if e.Level != "" {
		o.field("level", e.Level)
	}
	o.raw("message", jsonStringWTF8(e.Message))
	if e.HasLocation {
		o.field("location", e.Location)
	}
	return o.bytes()
}

// MarshalJSON encodes the location, or null for a nil location.
func (l *Location) MarshalJSON() ([]byte, error) {
	if l == nil {
		return []byte("null"), nil
	}
	o := newJSONObject()
	if l.File != "" {
		o.field("file", l.File)
	}
	o.field("start", l.Start)
	o.field("end", l.End)
	return o.bytes()
}

// MarshalJSON encodes the edge, omitting unset fields.
func (e LocationEdge) MarshalJSON() ([]byte, error) {
	o := newJSONObject()
	if e.Line != nil {
		o.field("line", *e.Line)
	}
	if e.Character != nil {
		o.field("character", *e.Character)
	}
	if e.Offset != nil {
		o.field("offset", *e.Offset)
	}
	return o.bytes()
}
