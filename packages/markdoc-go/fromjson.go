package markdoc

// A port of Ast.fromJSON from packages/markdoc/src/ast/index.ts.

import (
	"bytes"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode/utf16"
)

// FromJSON decodes an AST encoded by MarshalJSON or by JSON.stringify in
// JS, reviving its nodes, variables and functions. Other objects become
// *OrderedMap values.
func FromJSON(data []byte) (*Node, error) {
	v, err := decodeJS(data)
	if err != nil {
		return nil, err
	}
	n, ok := v.(*Node)
	if !ok {
		return nil, errors.New("markdoc: JSON is not a Markdoc node")
	}
	return n, nil
}

// decodeJS decodes JSON into JS-like values, keeping object key order and
// reviving objects with a $$mdtype. Lone surrogates in strings, which
// JSON.stringify writes as \uXXXX escapes, are kept as WTF-8, where
// encoding/json would replace them.
func decodeJS(data []byte) (any, error) {
	d := &jsonDecoder{src: data}
	d.space()
	v, err := d.value()
	if err != nil {
		return nil, err
	}
	if d.space(); d.pos < len(d.src) {
		return nil, d.errorf("unexpected data after JSON value")
	}
	return v, nil
}

type jsonDecoder struct {
	src []byte
	pos int
}

func (d *jsonDecoder) errorf(format string, args ...any) error {
	return fmt.Errorf("markdoc: invalid JSON at offset %d: %s", d.pos, fmt.Sprintf(format, args...))
}

func (d *jsonDecoder) space() {
	for d.pos < len(d.src) && strings.IndexByte(" \t\r\n", d.src[d.pos]) >= 0 {
		d.pos++
	}
}

func (d *jsonDecoder) expect(c byte) error {
	d.space()
	if d.pos >= len(d.src) || d.src[d.pos] != c {
		return d.errorf("expected %q", c)
	}
	d.pos++
	return nil
}

func (d *jsonDecoder) value() (any, error) {
	d.space()
	if d.pos >= len(d.src) {
		return nil, d.errorf("unexpected end of input")
	}
	switch c := d.src[d.pos]; {
	case c == '{':
		d.pos++
		m := NewOrderedMap()
		if d.space(); d.pos < len(d.src) && d.src[d.pos] == '}' {
			d.pos++
			return revive(m)
		}
		for {
			d.space()
			k, err := d.string()
			if err != nil {
				return nil, err
			}
			if err := d.expect(':'); err != nil {
				return nil, err
			}
			v, err := d.value()
			if err != nil {
				return nil, err
			}
			m.Set(k, v)
			if d.space(); d.pos < len(d.src) && d.src[d.pos] == ',' {
				d.pos++
				continue
			}
			if err := d.expect('}'); err != nil {
				return nil, err
			}
			return revive(m)
		}
	case c == '[':
		d.pos++
		list := []any{}
		if d.space(); d.pos < len(d.src) && d.src[d.pos] == ']' {
			d.pos++
			return list, nil
		}
		for {
			v, err := d.value()
			if err != nil {
				return nil, err
			}
			list = append(list, v)
			if d.space(); d.pos < len(d.src) && d.src[d.pos] == ',' {
				d.pos++
				continue
			}
			if err := d.expect(']'); err != nil {
				return nil, err
			}
			return list, nil
		}
	case c == '"':
		return d.string()
	case bytes.HasPrefix(d.src[d.pos:], []byte("true")):
		d.pos += 4
		return true, nil
	case bytes.HasPrefix(d.src[d.pos:], []byte("false")):
		d.pos += 5
		return false, nil
	case bytes.HasPrefix(d.src[d.pos:], []byte("null")):
		d.pos += 4
		return nil, nil
	}
	start := d.pos
	for d.pos < len(d.src) && strings.IndexByte("+-.0123456789eE", d.src[d.pos]) >= 0 {
		d.pos++
	}
	f, err := strconv.ParseFloat(string(d.src[start:d.pos]), 64)
	if err != nil || start == d.pos {
		d.pos = start
		return nil, d.errorf("unexpected character %q", d.src[start])
	}
	return f, nil
}

func (d *jsonDecoder) string() (string, error) {
	if d.pos >= len(d.src) || d.src[d.pos] != '"' {
		return "", d.errorf("expected string")
	}
	d.pos++
	var b strings.Builder
	for d.pos < len(d.src) {
		c := d.src[d.pos]
		switch {
		case c == '"':
			d.pos++
			return b.String(), nil
		case c != '\\':
			b.WriteByte(c)
			d.pos++
			continue
		}
		if d.pos+1 >= len(d.src) {
			break
		}
		esc := d.src[d.pos+1]
		d.pos += 2
		if i := strings.IndexByte("\"\\/bfnrt", esc); i >= 0 {
			b.WriteByte("\"\\/\b\f\n\r\t"[i])
			continue
		}
		if esc != 'u' {
			return "", d.errorf("invalid escape")
		}
		u, ok := d.hex4()
		if !ok {
			return "", d.errorf("invalid \\u escape")
		}
		if u >= 0xD800 && u < 0xDC00 && bytes.HasPrefix(d.src[d.pos:], []byte(`\u`)) {
			save := d.pos
			d.pos += 2
			if lo, ok := d.hex4(); ok && lo >= 0xDC00 && lo < 0xE000 {
				b.WriteRune(utf16.DecodeRune(u, lo))
				continue
			}
			d.pos = save
		}
		if u >= 0xD800 && u < 0xE000 {
			b.WriteString(wtf8(u))
		} else {
			b.WriteRune(u)
		}
	}
	return "", d.errorf("unterminated string")
}

func (d *jsonDecoder) hex4() (rune, bool) {
	if d.pos+4 > len(d.src) {
		return 0, false
	}
	n, err := strconv.ParseUint(string(d.src[d.pos:d.pos+4]), 16, 16)
	if err != nil {
		return 0, false
	}
	d.pos += 4
	return rune(n), true
}

// revive turns an object with a $$mdtype into the matching AST value, as
// the JS reviver does.
func revive(m *OrderedMap) (any, error) {
	switch m.Get("$$mdtype") {
	case "Variable":
		path, _ := m.Get("path").([]any)
		if path == nil {
			path = []any{}
		}
		return &Variable{Path: path}, nil
	case "Function":
		name, _ := m.Get("name").(string)
		params, _ := m.Get("parameters").(*OrderedMap)
		if params == nil {
			params = NewOrderedMap()
		}
		return &Function{Name: name, Parameters: params}, nil
	case "Node":
		return reviveNode(m)
	}
	return m, nil
}

func reviveNode(m *OrderedMap) (*Node, error) {
	typ, _ := m.Get("type").(string)
	if typ == "" {
		typ = "node"
	}
	tag, _ := m.Get("tag").(string)
	attributes, _ := m.Get("attributes").(*OrderedMap)
	n := NewNode(typ, attributes, nil, tag)

	if children, ok := m.Get("children").([]any); ok {
		for _, c := range children {
			child, ok := c.(*Node)
			if !ok {
				return nil, fmt.Errorf("markdoc: child of %s is not a node", typ)
			}
			n.Children = append(n.Children, child)
		}
	}
	n.Inline, _ = m.Get("inline").(bool)
	if lines, ok := m.Get("lines").([]any); ok {
		for _, l := range lines {
			f, _ := l.(float64)
			n.Lines = append(n.Lines, int(f))
		}
	}
	if slots, ok := m.Get("slots").(*OrderedMap); ok {
		for _, k := range slots.Keys() {
			if s, ok := slots.Get(k).(*Node); ok {
				n.Slots.Set(k, s)
			}
		}
	}
	if annotations, ok := m.Get("annotations").([]any); ok {
		for _, a := range annotations {
			am, ok := a.(*OrderedMap)
			if !ok {
				continue
			}
			t, _ := am.Get("type").(string)
			name, _ := am.Get("name").(string)
			n.Annotations = append(n.Annotations, AttributeValue{Type: t, Name: name, Value: am.Get("value")})
		}
	}
	if errs, ok := m.Get("errors").([]any); ok {
		for _, e := range errs {
			if em, ok := e.(*OrderedMap); ok {
				n.Errors = append(n.Errors, reviveError(em))
			}
		}
	}
	if m.Has("location") {
		n.Location = reviveLocation(m.Get("location"))
	}
	return n, nil
}

func reviveError(m *OrderedMap) ValidationError {
	e := ValidationError{}
	e.ID, _ = m.Get("id").(string)
	level, _ := m.Get("level").(string)
	e.Level = Level(level)
	e.Message, _ = m.Get("message").(string)
	if m.Has("location") {
		e.HasLocation = true
		e.Location = reviveLocation(m.Get("location"))
	}
	return e
}

func reviveLocation(v any) *Location {
	m, ok := v.(*OrderedMap)
	if !ok {
		return nil
	}
	loc := &Location{}
	loc.File, _ = m.Get("file").(string)
	loc.Start = reviveEdge(m.Get("start"))
	loc.End = reviveEdge(m.Get("end"))
	return loc
}

func reviveEdge(v any) LocationEdge {
	var e LocationEdge
	m, ok := v.(*OrderedMap)
	if !ok {
		return e
	}
	num := func(k string) *int {
		if f, ok := m.Get(k).(float64); ok {
			return intp(int(f))
		}
		return nil
	}
	e.Line, e.Character, e.Offset = num("line"), num("character"), num("offset")
	return e
}
