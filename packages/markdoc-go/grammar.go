package markdoc

// A port of packages/markdoc/src/grammar/tag.pegjs, the grammar for the
// contents of `{% %}`. It reproduces pegjs semantics, including how pegjs
// tracks expectations, so syntax error messages match the JS output.
//
// TODO: generate this from tag.pegjs instead of maintaining a hand port.

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"
	"unicode/utf8"

	"markdoc.dev/markdoc/internal/js"
)

type tagResult struct {
	Type    string
	Nesting int
	Meta    *tagMeta
}

type tagMeta struct {
	Tag        string
	Attributes []AttributeValue
	Variable   any // *Variable, *Function or a path for `@`
}

// SyntaxError mirrors pegjs' SyntaxError. The grammar works on UTF-16 code
// units, as pegjs does, so offsets match JS string indices.
type syntaxError struct {
	Message string
	Start   int
	End     int
}

func (e *syntaxError) Error() string { return e.Message }

type grammar struct {
	in       []uint16
	pos      int
	silent   int
	failPos  int
	expected []string
}

func parseTagContent(content string) (*tagResult, error) {
	g := &grammar{in: utf16.Encode([]rune(content))}
	result, ok := g.top()
	if ok && g.pos == len(g.in) {
		return result, nil
	}
	if ok && g.pos < len(g.in) {
		g.expectAlways("end of input")
	}
	return nil, g.error()
}

func (g *grammar) error() *syntaxError {
	found := "end of input"
	start, end := g.failPos, g.failPos
	if g.failPos < len(g.in) {
		found = `"` + literalEscape(unitString(g.in[g.failPos])) + `"`
		end = g.failPos + 1
	}
	return &syntaxError{
		Message: "Expected " + describeExpected(g.expected) + " but " + found + " found.",
		Start:   start,
		End:     end,
	}
}

// unitString converts one UTF-16 code unit to a string. A lone surrogate,
// which pegjs reports for an astral character, is kept as WTF-8 so the JSON
// encoder can write it as JS would.
func unitString(u uint16) string {
	if u >= 0xD800 && u <= 0xDFFF {
		return string([]byte{0xE0 | byte(u>>12), 0x80 | byte(u>>6&0x3F), 0x80 | byte(u&0x3F)})
	}
	return string(rune(u))
}

func units(us []uint16) string { return string(utf16.Decode(us)) }

func utf16Len(rs []rune) int {
	n := 0
	for _, r := range rs {
		if r >= 0x10000 {
			n += 2
		} else {
			n++
		}
	}
	return n
}

func describeExpected(expected []string) string {
	d := append([]string(nil), expected...)
	sort.Strings(d)
	j := 0
	for i := range d {
		if i == 0 || d[i] != d[i-1] {
			d[j] = d[i]
			j++
		}
	}
	d = d[:j]
	switch len(d) {
	case 1:
		return d[0]
	case 2:
		return d[0] + " or " + d[1]
	default:
		return strings.Join(d[:len(d)-1], ", ") + ", or " + d[len(d)-1]
	}
}

func literalEscape(s string) string {
	var b strings.Builder
	for i, r := range s {
		switch {
		case r == utf8.RuneError && s[i] == 0xED:
			// A WTF-8 lone surrogate from unitString; keep its bytes.
			b.WriteString(s[i : i+3])
			return literalEscapeTail(&b, s[i+3:])
		case r == '\\':
			b.WriteString(`\\`)
		case r == '"':
			b.WriteString(`\"`)
		case r == 0:
			b.WriteString(`\0`)
		case r == '\t':
			b.WriteString(`\t`)
		case r == '\n':
			b.WriteString(`\n`)
		case r == '\r':
			b.WriteString(`\r`)
		case r <= 0x0F:
			fmt.Fprintf(&b, `\x0%X`, r)
		case r <= 0x1F || (r >= 0x7F && r <= 0x9F):
			fmt.Fprintf(&b, `\x%X`, r)
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

func literalEscapeTail(b *strings.Builder, s string) string {
	b.WriteString(literalEscape(s))
	return b.String()
}

// expect records an expectation at the current position, as pegjs'
// rule$expects does before every attempt to match a literal or named rule.
func (g *grammar) expect(description string) {
	if g.silent == 0 {
		g.expectAlways(description)
	}
}

func (g *grammar) expectAlways(description string) {
	if g.pos < g.failPos {
		return
	}
	if g.pos > g.failPos {
		g.failPos = g.pos
		g.expected = nil
	}
	g.expected = append(g.expected, description)
}

func (g *grammar) literal(s string) bool {
	g.expect(`"` + literalEscape(s) + `"`)
	rs := utf16.Encode([]rune(s))
	if g.pos+len(rs) > len(g.in) {
		return false
	}
	for i, r := range rs {
		if g.in[g.pos+i] != r {
			return false
		}
	}
	g.pos += len(rs)
	return true
}

// named runs a rule with a display name, silencing its inner expectations.
func named[T any](g *grammar, name string, rule func() (T, bool)) (T, bool) {
	g.expect(name)
	g.silent++
	v, ok := rule()
	g.silent--
	return v, ok
}

func (g *grammar) peek() (uint16, bool) {
	if g.pos < len(g.in) {
		return g.in[g.pos], true
	}
	return 0, false
}

// Top = TopLevelValue / Annotation / TagOpen / TagClose
func (g *grammar) top() (*tagResult, bool) {
	if r, ok := g.topLevelValue(); ok {
		return r, true
	}
	if r, ok := g.annotation(); ok {
		return r, true
	}
	if r, ok := g.tagOpen(); ok {
		return r, true
	}
	return g.tagClose()
}

func (g *grammar) topLevelValue() (*tagResult, bool) {
	start := g.pos
	var v any
	var ok bool
	if v, ok = g.variable(); !ok {
		v, ok = g.function()
	}
	if !ok {
		g.pos = start
		return nil, false
	}
	return &tagResult{Type: "variable", Meta: &tagMeta{Variable: v}}, true
}

func (g *grammar) annotation() (*tagResult, bool) {
	start := g.pos
	attrs, ok := g.tagAttributes()
	if !ok {
		g.pos = start
		return nil, false
	}
	g.whitespaces()
	return &tagResult{Type: "annotation", Meta: &tagMeta{Attributes: attrs}}, true
}

func (g *grammar) tagOpen() (*tagResult, bool) {
	start := g.pos
	tag, ok := g.tagName()
	if !ok {
		g.pos = start
		return nil, false
	}
	g.whitespaces()

	var primary any
	hasPrimary := false
	before := g.pos
	if v, ok := g.value(); ok {
		g.whitespace()
		primary, hasPrimary = v, true
	} else {
		g.pos = before
	}

	before = g.pos
	attrs, hasAttrs := g.tagAttributes()
	if !hasAttrs {
		g.pos = before
	}
	g.whitespaces()
	closed := g.literal("/")

	// JS tests `if (primary)`, so falsy primary values are dropped.
	if hasPrimary && js.Truthy(primary) {
		attrs = append([]AttributeValue{{Type: "attribute", Name: "primary", Value: primary}}, attrs...)
		hasAttrs = true
	}
	if !hasAttrs {
		attrs = nil
	}

	r := &tagResult{Type: "tag_open", Nesting: 1, Meta: &tagMeta{Tag: tag, Attributes: attrs}}
	if closed {
		r.Type, r.Nesting = "tag", 0
	}
	return r, true
}

func (g *grammar) tagClose() (*tagResult, bool) {
	start := g.pos
	if !g.literal("/") {
		return nil, false
	}
	tag, ok := g.tagName()
	if !ok {
		g.pos = start
		return nil, false
	}
	return &tagResult{Type: "tag_close", Nesting: -1, Meta: &tagMeta{Tag: tag}}, true
}

func (g *grammar) tagName() (string, bool) {
	return named(g, "tag name", g.identifier)
}

func (g *grammar) tagAttributes() ([]AttributeValue, bool) {
	head, ok := g.tagAttributesItem()
	if !ok {
		return nil, false
	}
	items := []AttributeValue{head}
	for {
		start := g.pos
		if !g.whitespace() {
			break
		}
		for g.whitespace() {
		}
		item, ok := g.tagAttributesItem()
		if !ok {
			g.pos = start
			break
		}
		items = append(items, item)
	}
	return items, true
}

func (g *grammar) tagAttributesItem() (AttributeValue, bool) {
	if v, ok := g.tagShortcutID(); ok {
		return v, true
	}
	if v, ok := g.tagShortcutClass(); ok {
		return v, true
	}
	return g.tagAttribute()
}

func (g *grammar) tagShortcutClass() (AttributeValue, bool) {
	return named(g, "class", func() (AttributeValue, bool) {
		start := g.pos
		if !g.literal(".") {
			return AttributeValue{}, false
		}
		name, ok := g.identifier()
		if !ok {
			g.pos = start
			return AttributeValue{}, false
		}
		return AttributeValue{Type: "class", Name: name, Value: true}, true
	})
}

func (g *grammar) tagShortcutID() (AttributeValue, bool) {
	return named(g, "id", func() (AttributeValue, bool) {
		start := g.pos
		if !g.literal("#") {
			return AttributeValue{}, false
		}
		value, ok := g.identifier()
		if !ok {
			g.pos = start
			return AttributeValue{}, false
		}
		return AttributeValue{Type: "attribute", Name: "id", Value: value}, true
	})
}

func (g *grammar) tagAttribute() (AttributeValue, bool) {
	start := g.pos
	name, ok := g.identifier()
	if ok && g.literal("=") {
		if value, ok := g.value(); ok {
			return AttributeValue{Type: "attribute", Name: name, Value: value}, true
		}
	}
	g.pos = start
	return AttributeValue{}, false
}

type functionParameter struct {
	name    string
	hasName bool
	value   any
}

func (g *grammar) function() (any, bool) {
	start := g.pos
	name, ok := g.identifier()
	if !ok || !g.literal("(") {
		g.pos = start
		return nil, false
	}
	g.whitespaces()

	var params []functionParameter
	head, hasHead := g.functionParameter()
	var tail []functionParameter
	for {
		p, ok := g.functionParameterTail()
		if !ok {
			break
		}
		tail = append(tail, p)
	}
	if hasHead {
		params = append([]functionParameter{head}, tail...)
	}

	if !g.literal(")") {
		g.pos = start
		return nil, false
	}

	parameters := NewOrderedMap()
	for i, p := range params {
		key := strconv.Itoa(i)
		if p.hasName && p.name != "" {
			key = p.name
		}
		parameters.Set(key, p.value)
	}
	return &Function{Name: name, Parameters: parameters}, true
}

func (g *grammar) functionParameter() (functionParameter, bool) {
	start := g.pos
	var p functionParameter
	if name, ok := g.identifier(); ok && g.literal("=") {
		p.name, p.hasName = name, true
	} else {
		g.pos = start
	}
	value, ok := g.value()
	if !ok {
		g.pos = start
		return functionParameter{}, false
	}
	p.value = value
	return p, true
}

func (g *grammar) functionParameterTail() (functionParameter, bool) {
	start := g.pos
	g.whitespaces()
	if !g.literal(",") {
		g.pos = start
		return functionParameter{}, false
	}
	g.whitespaces()
	p, ok := g.functionParameter()
	if !ok {
		g.pos = start
		return functionParameter{}, false
	}
	return p, true
}

func (g *grammar) trailingComma() {
	start := g.pos
	g.whitespaces()
	if !g.literal(",") {
		g.pos = start
	}
}

func (g *grammar) variable() (any, bool) {
	return named(g, "variable", func() (any, bool) {
		start := g.pos
		prefix, ok := g.peek()
		if !ok || (prefix != '$' && prefix != '@') {
			return nil, false
		}
		g.pos++
		head, ok := g.identifier()
		if !ok {
			g.pos = start
			return nil, false
		}
		path := []any{head}
		for {
			v, ok := g.variableTail()
			if !ok {
				break
			}
			path = append(path, v)
		}
		if prefix == '@' {
			return path, true
		}
		return &Variable{Path: path}, true
	})
}

func (g *grammar) variableTail() (any, bool) {
	start := g.pos
	if g.literal(".") {
		if name, ok := g.identifier(); ok {
			return name, true
		}
		g.pos = start
	}
	if g.literal("[") {
		var v any
		var ok bool
		if v, ok = g.valueNumber(); !ok {
			v, ok = g.valueString()
		}
		if ok && g.literal("]") {
			return v, true
		}
	}
	g.pos = start
	return nil, false
}

func (g *grammar) value() (any, bool) {
	for _, alt := range []func() (any, bool){
		g.valueNull, g.valueBoolean, g.valueString, g.valueNumber,
		g.valueArray, g.valueHash, g.function, g.variable,
	} {
		if v, ok := alt(); ok {
			return v, true
		}
	}
	return nil, false
}

func (g *grammar) valueNull() (any, bool) {
	return named(g, "null", func() (any, bool) {
		return nil, g.literal("null")
	})
}

func (g *grammar) valueBoolean() (any, bool) {
	return named(g, "boolean", func() (any, bool) {
		if g.literal("true") {
			return true, true
		}
		if g.literal("false") {
			return false, true
		}
		return nil, false
	})
}

func (g *grammar) valueArray() (any, bool) {
	start := g.pos
	if !g.literal("[") {
		return nil, false
	}
	g.whitespaces()
	items := []any{}
	if head, ok := g.value(); ok {
		items = append(items, head)
		for {
			s := g.pos
			g.whitespaces()
			if !g.literal(",") {
				g.pos = s
				break
			}
			g.whitespaces()
			v, ok := g.value()
			if !ok {
				g.pos = s
				break
			}
			items = append(items, v)
		}
		g.trailingComma()
	}
	g.whitespaces()
	if !g.literal("]") {
		g.pos = start
		return nil, false
	}
	return items, true
}

func (g *grammar) valueHash() (any, bool) {
	start := g.pos
	if !g.literal("{") {
		return nil, false
	}
	g.whitespaces()
	hash := NewOrderedMap()
	if g.valueHashItem(hash) {
		for {
			s := g.pos
			g.whitespaces()
			if !g.literal(",") {
				g.pos = s
				break
			}
			g.whitespaces()
			if !g.valueHashItem(hash) {
				g.pos = s
				break
			}
		}
		g.trailingComma()
	}
	g.whitespaces()
	if !g.literal("}") {
		g.pos = start
		return nil, false
	}
	return hash, true
}

func (g *grammar) valueHashItem(hash *OrderedMap) bool {
	start := g.pos
	key, ok := g.identifier()
	if !ok {
		var v any
		if v, ok = g.valueString(); ok {
			key = v.(string)
		}
	}
	if !ok || !g.literal(":") {
		g.pos = start
		return false
	}
	g.whitespaces()
	value, ok := g.value()
	if !ok {
		g.pos = start
		return false
	}
	if key != "$$mdtype" {
		hash.Set(key, value)
	}
	return true
}

func (g *grammar) valueNumber() (any, bool) {
	return named(g, "number", func() (any, bool) {
		start := g.pos
		if r, ok := g.peek(); ok && r == '-' {
			g.pos++
		}
		if !g.digits() {
			g.pos = start
			return nil, false
		}
		if r, ok := g.peek(); ok && r == '.' {
			s := g.pos
			g.pos++
			if !g.digits() {
				g.pos = s
			}
		}
		f, _ := strconv.ParseFloat(units(g.in[start:g.pos]), 64)
		return f, true
	})
}

func (g *grammar) digits() bool {
	start := g.pos
	for g.pos < len(g.in) && g.in[g.pos] >= '0' && g.in[g.pos] <= '9' {
		g.pos++
	}
	return g.pos > start
}

func (g *grammar) valueString() (any, bool) {
	return named(g, "string", func() (any, bool) {
		start := g.pos
		if !g.literal(`"`) {
			return nil, false
		}
		var b []uint16
		for {
			r, ok := g.peek()
			if !ok {
				break
			}
			if r > 0x1F && r != '"' && r != '\\' {
				b = append(b, r)
				g.pos++
				continue
			}
			if r != '\\' || g.pos+1 >= len(g.in) {
				break
			}
			switch g.in[g.pos+1] {
			case '"':
				b = append(b, '"')
			case '\\':
				b = append(b, '\\')
			case 'n':
				b = append(b, '\n')
			case 'r':
				b = append(b, '\r')
			case 't':
				b = append(b, '\t')
			default:
				goto done
			}
			g.pos += 2
		}
	done:
		if !g.literal(`"`) {
			g.pos = start
			return nil, false
		}
		return units(b), true
	})
}

func (g *grammar) identifier() (string, bool) {
	return named(g, "identifier", func() (string, bool) {
		start := g.pos
		for g.pos < len(g.in) && isIdentifierChar(g.in[g.pos]) {
			g.pos++
		}
		return units(g.in[start:g.pos]), g.pos > start
	})
}

func isIdentifierChar(r uint16) bool {
	return r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-'
}

func (g *grammar) whitespace() bool {
	_, ok := named(g, "whitespace", func() (struct{}, bool) {
		r, ok := g.peek()
		if ok && (r == ' ' || r == '\n' || r == '\t') {
			g.pos++
			return struct{}{}, true
		}
		return struct{}{}, false
	})
	return ok
}

func (g *grammar) whitespaces() {
	for g.whitespace() {
	}
}
