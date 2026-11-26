// Package js implements the JS value semantics that Markdoc's results
// depend on, shared by package markdoc and its renderers: String(value),
// Number.prototype.toString, truthiness and whitespace.
package js

import (
	"math"
	"reflect"
	"strconv"
	"strings"
)

// Undefined is the type of JS undefined, which package markdoc exports as
// UndefinedType.
type Undefined struct{}

// MarshalJSON encodes Undefined as JSON.stringify does inside arrays.
func (Undefined) MarshalJSON() ([]byte, error) { return []byte("null"), nil }

func (Undefined) String() string { return "undefined" }

func IsASCIILetter(c byte) bool { return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' }

func IsUndefined(v any) bool { _, ok := v.(Undefined); return ok }

// IsNullish reports whether v is null or undefined.
func IsNullish(v any) bool { return v == nil || IsUndefined(v) }

// Truthy follows JS truthiness.
func Truthy(v any) bool {
	switch v := v.(type) {
	case nil, Undefined:
		return false
	case bool:
		return v
	case string:
		return v != ""
	}
	if f, ok := ToNumber(v); ok {
		return f != 0 && !math.IsNaN(f)
	}
	return true
}

// ToNumber returns the value of a Go number as a float64.
func ToNumber(v any) (float64, bool) {
	switch v := v.(type) {
	case float64:
		return v, true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case float32:
		return float64(v), true
	case int8, int16, int32, uint, uint8, uint16, uint32, uint64:
		return reflect.ValueOf(v).Convert(reflect.TypeFor[float64]()).Float(), true
	}
	return 0, false
}

// FormatNumber formats a number as JS Number.prototype.toString does.
func FormatNumber(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case f == 0:
		return "0"
	case f < 0:
		return "-" + FormatNumber(-f)
	}
	// The shortest digits that round-trip, as in ECMAScript Number::toString.
	s := strconv.FormatFloat(f, 'e', -1, 64)
	mantissa, exp, _ := strings.Cut(s, "e")
	digits := strings.Replace(mantissa, ".", "", 1)
	e, _ := strconv.Atoi(exp)
	k, n := len(digits), e+1
	switch {
	case k <= n && n <= 21:
		return digits + strings.Repeat("0", n-k)
	case 0 < n && n <= 21:
		return digits[:n] + "." + digits[n:]
	case -6 < n && n <= 0:
		return "0." + strings.Repeat("0", -n) + digits
	}
	sign := "+"
	if n-1 < 0 {
		sign = "-"
	}
	exponent := "e" + sign + strconv.Itoa(abs(n-1))
	if k == 1 {
		return digits + exponent
	}
	return digits[:1] + "." + digits[1:] + exponent
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// ToString converts a value to a string as JS String(value) does.
func ToString(v any) string {
	switch v := v.(type) {
	case nil:
		return "null"
	case Undefined:
		return "undefined"
	case string:
		return v
	case bool:
		return strconv.FormatBool(v)
	case []any:
		parts := make([]string, len(v))
		for i, x := range v {
			if !IsNullish(x) {
				parts[i] = ToString(x)
			}
		}
		return strings.Join(parts, ",")
	}
	if f, ok := ToNumber(v); ok {
		return FormatNumber(f)
	}
	if items, ok := SliceItems(v); ok {
		return ToString(items)
	}
	return "[object Object]"
}

// SliceItems returns the elements of any Go slice or array other than []any
// and []byte, which JS would see as an array.
func SliceItems(v any) ([]any, bool) {
	rv := reflect.ValueOf(v)
	if !rv.IsValid() || (rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array) {
		return nil, false
	}
	if rv.Type().Elem().Kind() == reflect.Uint8 {
		return nil, false
	}
	items := make([]any, rv.Len())
	for i := range items {
		items[i] = rv.Index(i).Interface()
	}
	return items, true
}

// AsArray returns v's elements if JS would see v as an array.
func AsArray(v any) ([]any, bool) {
	if a, ok := v.([]any); ok {
		return a, true
	}
	return SliceItems(v)
}

// Trim trims JS whitespace (String.prototype.trim).
func Trim(s string) string {
	return strings.TrimFunc(s, IsWhitespace)
}

func IsWhitespace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF:
		return true
	}
	return r >= 0x2000 && r <= 0x200A
}
