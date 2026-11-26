package markdoc

// JS value semantics used by resolve, transform, validate, format and the
// renderers: String(value), Number.prototype.toString, ===, truthiness and
// JSON.stringify.

import (
	"bytes"
	"encoding/json"
	"math"
	"reflect"
	"sort"
	"strconv"
	"strings"

	"markdoc.dev/markdoc/internal/js"
)

// UndefinedType is the type of Undefined.
type UndefinedType = js.Undefined

// Undefined is JS undefined. It is what a missing variable or a function
// without a Transform resolves to, and it is distinct from nil, which is JS
// null. Attributes that resolve to Undefined fall back to their schema's
// Default, and JSON encoding drops them from objects.
var Undefined = UndefinedType{}

// Truthy reports whether a condition holds, as the `if` tag and the `and`,
// `or` and `not` functions decide it: every value except false, nil and
// Undefined is true. Unlike JS truthiness, 0 and "" are true.
func Truthy(v any) bool { return v != false && !js.IsNullish(v) }

// isObject reports whether typeof v is "object" in JS (including null).
func isObject(v any) bool {
	switch v.(type) {
	case nil, *OrderedMap, []any, map[string]any, *Variable, *Function, *Node, *Tag:
		return true
	case UndefinedType, string, bool:
		return false
	}
	if _, ok := js.ToNumber(v); ok {
		return false
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Map, reflect.Slice, reflect.Array, reflect.Struct, reflect.Pointer:
		return true
	}
	return false
}

// strictEquals compares values as JS === does: primitives by value and
// everything else by identity.
func strictEquals(a, b any) bool {
	if fa, ok := js.ToNumber(a); ok {
		fb, ok := js.ToNumber(b)
		return ok && fa == fb
	}
	switch a := a.(type) {
	case nil, UndefinedType, string, bool:
		return a == b
	}
	ra, rb := reflect.ValueOf(a), reflect.ValueOf(b)
	if !ra.IsValid() || !rb.IsValid() || ra.Type() != rb.Type() {
		return false
	}
	switch ra.Kind() {
	case reflect.Slice, reflect.Map, reflect.Pointer, reflect.Func, reflect.Chan:
		if ra.Kind() == reflect.Slice && ra.Len() != rb.Len() {
			return false
		}
		return ra.Pointer() == rb.Pointer()
	}
	return ra.Type().Comparable() && a == b
}

// sameValueZero is strictEquals, except that NaN equals NaN, as in
// Array.prototype.includes.
func sameValueZero(a, b any) bool {
	fa, aok := js.ToNumber(a)
	fb, bok := js.ToNumber(b)
	if aok && bok && math.IsNaN(fa) && math.IsNaN(fb) {
		return true
	}
	return strictEquals(a, b)
}

// objectEntries returns the own enumerable entries of a JS object, as
// Object.entries does: an *OrderedMap in key order, a Go map in sorted key
// order, an array by index, or the exported fields of a struct.
func objectEntries(v any) (keys []string, values []any) {
	switch v := v.(type) {
	case *OrderedMap:
		if v == nil {
			return nil, nil
		}
		for _, k := range v.Keys() {
			keys = append(keys, k)
			values = append(values, v.values[k])
		}
		return keys, values
	case map[string]any:
		for k := range v {
			keys = append(keys, k)
		}
		sortJSKeys(keys)
		for _, k := range keys {
			values = append(values, v[k])
		}
		return keys, values
	case string:
		for i, u := range utf16Units(v) {
			keys = append(keys, strconv.Itoa(i))
			values = append(values, u)
		}
		return keys, values
	}
	if items, ok := js.AsArray(v); ok {
		for i, x := range items {
			keys = append(keys, strconv.Itoa(i))
			values = append(values, x)
		}
		return keys, values
	}
	rv := reflect.ValueOf(v)
	for rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	switch rv.Kind() {
	case reflect.Map:
		if rv.Type().Key().Kind() != reflect.String {
			return nil, nil
		}
		index := map[string]reflect.Value{}
		for _, k := range rv.MapKeys() {
			keys = append(keys, k.String())
			index[k.String()] = rv.MapIndex(k)
		}
		sortJSKeys(keys)
		for _, k := range keys {
			values = append(values, index[k].Interface())
		}
	case reflect.Struct:
		t := rv.Type()
		for i := range t.NumField() {
			if f := t.Field(i); f.IsExported() {
				keys = append(keys, fieldName(f))
				values = append(values, rv.Field(i).Interface())
			}
		}
	}
	return keys, values
}

// fieldName is a struct field's name as a JS key: its json tag name, if it
// has one.
func fieldName(f reflect.StructField) string {
	if name, _, _ := strings.Cut(f.Tag.Get("json"), ","); name != "" && name != "-" {
		return name
	}
	return f.Name
}

// sortJSKeys sorts keys as JS orders an object's keys when they come from a
// Go map, whose order is random: integer-like keys ascending, then the rest
// in byte order.
func sortJSKeys(keys []string) {
	sort.Slice(keys, func(i, j int) bool {
		a, b := keys[i], keys[j]
		ai, bi := isArrayIndex(a), isArrayIndex(b)
		if ai != bi {
			return ai
		}
		if ai {
			x, _ := strconv.ParseUint(a, 10, 32)
			y, _ := strconv.ParseUint(b, 10, 32)
			return x < y
		}
		return a < b
	})
}

// utf16Units splits a string into its UTF-16 code units, as JS indexes it.
// Lone surrogates are WTF-8 encoded.
func utf16Units(s string) []string {
	var out []string
	for _, r := range s {
		if r >= 0x10000 {
			r -= 0x10000
			out = append(out, wtf8(0xD800+(r>>10)), wtf8(0xDC00+(r&0x3FF)))
			continue
		}
		out = append(out, string(r))
	}
	return out
}

func wtf8(u rune) string {
	return string([]byte{0xE0 | byte(u>>12), 0x80 | byte(u>>6)&0x3F, 0x80 | byte(u)&0x3F})
}

// getProperty reads obj[key] as JS does, for the value types a variable
// path walks through. found is false when the property doesn't exist.
func getProperty(obj any, key any) (value any, found bool) {
	k := js.ToString(key)
	switch o := obj.(type) {
	case *OrderedMap:
		if o != nil && o.Has(k) {
			return o.values[k], true
		}
		return Undefined, false
	case map[string]any:
		if v, ok := o[k]; ok {
			return v, true
		}
		return Undefined, false
	case string:
		units := utf16Units(o)
		if k == "length" {
			return float64(len(units)), true
		}
		if i, err := strconv.Atoi(k); err == nil && isArrayIndex(k) && i < len(units) {
			return units[i], true
		}
		return Undefined, false
	}
	if items, ok := js.AsArray(obj); ok {
		if k == "length" {
			return float64(len(items)), true
		}
		if i, err := strconv.Atoi(k); err == nil && isArrayIndex(k) && i < len(items) {
			return items[i], true
		}
		return Undefined, false
	}
	keys, values := objectEntries(obj)
	for i, name := range keys {
		if name == k {
			return values[i], true
		}
	}
	return Undefined, false
}

// marshalJS encodes v as JSON.stringify would.
func marshalJS(v any) ([]byte, error) {
	var buf bytes.Buffer
	if err := encodeJS(&buf, v); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// encodeJS writes v as JSON.stringify would. Undefined is written as null,
// which is what JSON.stringify does inside arrays; objects skip it.
func encodeJS(buf *bytes.Buffer, v any) error {
	switch v := v.(type) {
	case nil, UndefinedType:
		buf.WriteString("null")
		return nil
	case string:
		buf.Write(jsonStringWTF8(v))
		return nil
	case bool:
		buf.WriteString(strconv.FormatBool(v))
		return nil
	case []any:
		return encodeArray(buf, v)
	case *OrderedMap:
		if v == nil {
			buf.WriteString("null")
			return nil
		}
		keys, values := objectEntries(v)
		return encodeObject(buf, keys, values)
	case map[string]any:
		keys, values := objectEntries(v)
		return encodeObject(buf, keys, values)
	case json.Marshaler:
		b, err := v.MarshalJSON()
		if err != nil {
			return err
		}
		buf.Write(b)
		return nil
	}
	if f, ok := js.ToNumber(v); ok {
		if math.IsNaN(f) || math.IsInf(f, 0) {
			buf.WriteString("null")
		} else {
			buf.WriteString(js.FormatNumber(f))
		}
		return nil
	}
	if items, ok := js.SliceItems(v); ok {
		return encodeArray(buf, items)
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && rv.IsNil() {
		buf.WriteString("null")
		return nil
	}
	if rv.Kind() == reflect.Map || rv.Kind() == reflect.Struct ||
		(rv.Kind() == reflect.Pointer && rv.Elem().Kind() == reflect.Struct) {
		keys, values := objectEntries(v)
		return encodeObject(buf, keys, values)
	}
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	buf.Write(b)
	return nil
}

func encodeArray(buf *bytes.Buffer, items []any) error {
	buf.WriteByte('[')
	for i, x := range items {
		if i > 0 {
			buf.WriteByte(',')
		}
		if err := encodeJS(buf, x); err != nil {
			return err
		}
	}
	buf.WriteByte(']')
	return nil
}

func encodeObject(buf *bytes.Buffer, keys []string, values []any) error {
	buf.WriteByte('{')
	first := true
	for i, k := range keys {
		if js.IsUndefined(values[i]) {
			continue
		}
		if !first {
			buf.WriteByte(',')
		}
		first = false
		buf.Write(jsonStringWTF8(k))
		buf.WriteByte(':')
		if err := encodeJS(buf, values[i]); err != nil {
			return err
		}
	}
	buf.WriteByte('}')
	return nil
}

// jsonStringify is JSON.stringify(v, null, indent). ok is false when JS
// would return undefined rather than a string.
func jsonStringify(v any, indent string) (s string, ok bool, err error) {
	if js.IsUndefined(v) {
		return "", false, nil
	}
	b, err := marshalJS(v)
	if err != nil {
		return "", false, err
	}
	if indent == "" {
		return string(b), true, nil
	}
	var out bytes.Buffer
	if err := json.Indent(&out, b, "", indent); err != nil {
		return "", false, err
	}
	return out.String(), true, nil
}
