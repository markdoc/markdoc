package markdoc

// A port of packages/markdoc/src/formatter.ts. The JS generators yield
// strings, except that table rows are yielded as arrays of cell strings, so
// each piece here is a string or a []string.

import (
	"math"
	"strconv"
	"strings"
	"unicode/utf8"

	"markdoc.dev/markdoc/internal/js"
)

// FormatOptions configures Format.
type FormatOptions struct {
	// AllowIndentation indents the children of block tags by two spaces.
	AllowIndentation bool `json:"allowIndentation"`
	// MaxTagOpeningWidth is the width above which a block tag's attributes
	// are put on separate lines. Zero means 80.
	MaxTagOpeningWidth int `json:"maxTagOpeningWidth"`
	// OrderedListMode is "increment" to number ordered list items 1, 2, 3,
	// or "repeat" (the default) to number every item after the first 1.
	OrderedListMode string `json:"orderedListMode"`
}

type formatOptions struct {
	FormatOptions
	parent *Node
	indent int
	// markdown selects formatMarkdown's output; singleLine and tableCell
	// are its state.
	markdown, singleLine, tableCell bool
}

const (
	fmtSpace = " "
	fmtSep   = ", "
	fmtNL    = "\n"
	fmtOL    = "."
	fmtUL    = "-"

	maxTagOpeningWidth = 80
)

func increment(o formatOptions, n int) formatOptions {
	o.indent += n
	return o
}

// Format prints an AST, or a value from one, as Markdoc source.
func Format(v any, opts *FormatOptions) string {
	var o formatOptions
	if opts != nil {
		o.FormatOptions = *opts
	}
	return format(v, o)
}

func format(v any, o formatOptions) string {
	return strings.TrimLeftFunc(joinPieces(formatValue(v, o)), js.IsWhitespace)
}

// pieceString converts a piece to a string as JS string concatenation does.
func pieceString(p any) string {
	if row, ok := p.([]string); ok {
		return strings.Join(row, ",")
	}
	return p.(string)
}

func joinPieces(pieces []any) string {
	var b strings.Builder
	for _, p := range pieces {
		b.WriteString(pieceString(p))
	}
	return b.String()
}

func formatChildren(n *Node, o formatOptions) []any {
	var out []any
	for _, child := range n.Children {
		out = append(out, formatValue(child, o)...)
	}
	return out
}

func formatInline(pieces []any) []any {
	return []any{js.Trim(joinPieces(pieces))}
}

func formatTableRow(items []string) string {
	return "| " + strings.Join(items, " | ") + " |"
}

// formatScalar formats an attribute value. ok is false for Undefined.
func formatScalar(v any) (string, bool) {
	switch v := v.(type) {
	case UndefinedType:
		return "", false
	case *Node, *Variable, *Function:
		return format(v, formatOptions{}), true
	case nil:
		return "null", true
	case string:
		return string(jsonStringWTF8(v)), true
	case bool:
		return strconv.FormatBool(v), true
	case *OrderedMap, map[string]any:
		keys, values := objectEntries(v)
		parts := make([]string, len(keys))
		for i, k := range keys {
			value, ok := formatScalar(values[i])
			if !ok {
				value = "undefined"
			}
			if isIdentifier(k) {
				parts[i] = k + ": " + value
			} else {
				parts[i] = `"` + k + `": ` + value
			}
		}
		return "{" + strings.Join(parts, fmtSep) + "}", true
	}
	if items, ok := js.AsArray(v); ok {
		parts := make([]string, len(items))
		for i, x := range items {
			parts[i], _ = formatScalar(x)
		}
		return "[" + strings.Join(parts, fmtSep) + "]", true
	}
	s, ok, _ := jsonStringify(v, "")
	return s, ok
}

func isIdentifier(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if !js.IsASCIILetter(c) && (c < '0' || c > '9') && c != '_' && c != '-' {
			return false
		}
	}
	return true
}

func formatAnnotationValue(a AttributeValue) (string, bool) {
	value, ok := formatScalar(a.Value)
	if !ok {
		return "", false
	}
	if a.Name == "primary" {
		return value, true
	}
	if s, isString := a.Value.(string); a.Name == "id" && isString && isIdentifier(s) {
		return "#" + s, true
	}
	if a.Type == "class" && isIdentifier(a.Name) {
		return "." + a.Name, true
	}
	return a.Name + "=" + value, true
}

// formatAttributes returns the formatted attributes, leaving out undefined
// values.
func formatAttributes(n *Node) []string {
	var out []string
	add := func(s string, ok bool) {
		if ok {
			out = append(out, s)
		}
	}
	for _, key := range n.Attributes.Keys() {
		value := n.Attributes.Get(key)
		// A class that isn't a valid identifier is formatted as a regular
		// attribute, without the '.' sigil.
		if key == "class" && isObject(value) && !isAst(value) {
			names, _ := objectEntries(value)
			for _, name := range names {
				add(formatAnnotationValue(AttributeValue{Type: "class", Name: name, Value: value}))
			}
		} else {
			add(formatAnnotationValue(AttributeValue{Type: "attribute", Name: key, Value: value}))
		}
	}
	return out
}

func formatAnnotations(n *Node) []any {
	if len(n.Annotations) == 0 {
		return nil
	}
	parts := make([]string, len(n.Annotations))
	for i, a := range n.Annotations {
		parts[i], _ = formatAnnotationValue(a)
	}
	return []any{tagOpen + fmtSpace, strings.Join(parts, fmtSpace), fmtSpace + tagClose}
}

func formatVariable(v *Variable) []any {
	var b strings.Builder
	for i, p := range v.Path {
		s, isString := p.(string)
		switch {
		case i == 0:
			b.WriteString(js.ToString(p))
		case isString && isIdentifier(s):
			b.WriteString("." + s)
		case !isString:
			b.WriteString("[" + js.ToString(p) + "]")
		default:
			b.WriteString(`["` + s + `"]`)
		}
	}
	return []any{"$", b.String()}
}

func formatFunction(f *Function) []any {
	_, values := objectEntries(f.Parameters)
	parts := make([]string, len(values))
	for i, v := range values {
		parts[i], _ = formatScalar(v)
	}
	return []any{f.Name, "(", strings.Join(parts, fmtSep), ")"}
}

// trimStart drops leading pieces that are only whitespace and trims the
// start of the first one that isn't.
func trimStart(pieces []any) []any {
	for i, p := range pieces {
		if s := strings.TrimLeftFunc(pieceString(p), js.IsWhitespace); s != "" {
			return append([]any{s}, pieces[i+1:]...)
		}
	}
	return nil
}

func escapeNBSP(s string) string { return strings.ReplaceAll(s, "\u00a0", "&nbsp;") }

// escapeChars puts a backslash before every character of s in chars.
func escapeChars(s, chars string) string {
	var b strings.Builder
	for _, r := range s {
		if strings.ContainsRune(chars, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return escapeNBSP(b.String())
}

// escapeBlockStart escapes the first match of /^\*|#+\s|^>/ in s, which
// would otherwise start a list item, heading or blockquote.
func escapeBlockStart(s string) string {
	if strings.HasPrefix(s, "*") || strings.HasPrefix(s, ">") {
		return escapeNBSP(`\` + s)
	}
	for i := 0; i < len(s); {
		if s[i] != '#' {
			i++
			continue
		}
		j := i
		for j < len(s) && s[j] == '#' {
			j++
		}
		if r, _ := utf8.DecodeRuneInString(s[j:]); j < len(s) && js.IsWhitespace(r) {
			return escapeNBSP(s[:i] + `\` + s[i:])
		}
		i = j
	}
	return escapeNBSP(s)
}

var wrappingTypes = map[string]bool{"strong": true, "em": true, "s": true}

func formatNode(n *Node, o formatOptions) []any {
	no := o
	no.parent = n
	indent := strings.Repeat(fmtSpace, no.indent)
	var out []any
	yield := func(pieces ...any) { out = append(out, pieces...) }

	switch n.Type {
	case "document":
		if fm, ok := n.Attributes.Get("frontmatter").(string); ok && fm != "" {
			yield("---" + fmtNL + fm + fmtNL + "---" + fmtNL + fmtNL)
		}
		yield(trimStart(formatChildren(n, no))...)
	case "heading":
		level := 1
		if f, ok := js.ToNumber(n.Attributes.Get("level")); ok && f != 0 {
			level = int(f)
		}
		yield(fmtNL, indent, strings.Repeat("#", max(level, 0)), fmtSpace)
		yield(trimStart(formatChildren(n, no))...)
		yield(formatAnnotations(n)...)
		yield(fmtNL)
	case "paragraph":
		yield(fmtNL)
		yield(formatChildren(n, no)...)
		yield(formatAnnotations(n)...)
		yield(fmtNL)
	case "inline":
		yield(indent)
		yield(formatChildren(n, no)...)
	case "image":
		yield("!", "[")
		yield(formatValue(attributeOrUndefined(n, "alt"), no)...)
		yield("]", "(")
		if src, ok := n.Attributes.Get("src").(string); ok {
			yield(escapeChars(src, "()"))
		} else {
			yield(formatValue(attributeOrUndefined(n, "src"), no)...)
		}
		if title := n.Attributes.Get("title"); js.Truthy(title) {
			yield(fmtSpace + `"` + js.ToString(title) + `"`)
		}
		yield(")")
	case "link":
		children := joinPieces(formatChildren(n, no))
		href := n.Attributes.Get("href")
		title := n.Attributes.Get("title")

		// https://spec.commonmark.org/0.31.2/#autolinks
		if h, ok := href.(string); ok && children == h && !js.Truthy(title) {
			yield("<" + h + ">")
			break
		}

		yield("[", children, "]", "(")
		if h, ok := href.(string); ok {
			yield(escapeChars(h, "()"))
		} else {
			yield(formatValue(attributeOrUndefined(n, "href"), no)...)
		}
		if js.Truthy(title) {
			yield(fmtSpace + `"` + js.ToString(title) + `"`)
		}
		yield(")")
	case "text":
		content := n.Attributes.Get("content")
		if isAst(content) {
			yield(tagOpen + fmtSpace)
			yield(formatValue(content, no)...)
			yield(fmtSpace + tagClose)
			break
		}
		s := js.ToString(content)
		if o.parent != nil && wrappingTypes[o.parent.Type] {
			// Escape **strong**, _em_, and ~~s~~
			yield(escapeChars(s, "*_~"))
		} else {
			// Escape > blockquote, * list item, and heading
			yield(escapeBlockStart(s))
		}
	case "blockquote":
		prefix := fmtNL + indent + ">" + fmtSpace
		inner := make([]string, len(n.Children))
		for i, child := range n.Children {
			co := no
			co.indent = 0
			inner[i] = js.Trim(format(child, co))
		}
		yield(prefix + strings.ReplaceAll(strings.Join(inner, fmtNL+fmtNL), fmtNL, prefix) + fmtNL)
	case "hr":
		yield(fmtNL, indent, "---", fmtNL)
	case "fence":
		yield(fmtNL, indent)
		content := js.ToString(n.Attributes.Get("content"))
		longest := 0
		for i := 0; i < len(content); {
			if content[i] != '`' {
				i++
				continue
			}
			j := i
			for j < len(content) && content[j] == '`' {
				j++
			}
			if j-i >= 3 {
				longest = max(longest, j-i)
			}
			i = j
		}
		boundary := "```"
		if longest > 0 {
			boundary = strings.Repeat("`", longest+1)
		}
		yield(boundary)
		if language := n.Attributes.Get("language"); js.Truthy(language) {
			yield(js.ToString(language))
		}
		if len(n.Annotations) > 0 {
			yield(fmtSpace)
		}
		yield(formatAnnotations(n)...)
		yield(fmtNL, indent, strings.ReplaceAll(content, fmtNL, fmtNL+indent))
		if !strings.HasSuffix(content, fmtNL) {
			yield(fmtNL)
		}
		yield(boundary, fmtNL)
	case "tag":
		if !n.Inline {
			yield(fmtNL, indent)
		}
		open := tagOpen + fmtSpace
		tag := append([]string{open + n.Tag}, formatAttributes(n)...)
		inlineTag := strings.Join(tag, fmtSpace)

		width := o.MaxTagOpeningWidth
		if width == 0 {
			width = maxTagOpeningWidth
		}
		isLongTagOpening := utf16Len([]rune(inlineTag))+len(open)*2 > width

		opening := inlineTag
		if !n.Inline && isLongTagOpening {
			// {% tag attributes={...} %}
			opening = strings.Join(tag, fmtNL+strings.Repeat(fmtSpace, len(open))+indent)
		}
		closing := "/"
		if len(n.Children) > 0 {
			closing = ""
		}
		yield(opening + fmtSpace + closing + tagClose)

		if len(n.Children) > 0 {
			co := no
			if no.AllowIndentation {
				co = increment(no, 2)
			}
			yield(formatChildren(n, co)...)
			if !n.Inline {
				yield(indent)
			}
			// {% /tag %}
			yield(tagOpen + fmtSpace + "/" + n.Tag + fmtSpace + tagClose)
		}
		if !n.Inline {
			yield(fmtNL)
		}
	case "list":
		isLoose := false
		for _, item := range n.Children {
			for _, c := range item.Children {
				if c.Type == "paragraph" {
					isLoose = true
				}
			}
		}

		for i, item := range n.Children {
			prefix := listPrefix(n, i, o)
			d := format(item, increment(no, utf16Len([]rune(prefix))+1))
			if !isLoose || i == len(n.Children)-1 {
				d = js.Trim(d)
			}
			yield(fmtNL + indent + prefix + " " + d)
		}
		yield(fmtNL)
	case "item":
		for i, child := range n.Children {
			yield(formatValue(child, no)...)
			if i == 0 {
				yield(formatAnnotations(n)...)
			}
		}
	case "strong":
		marker := markerOr(n, "**")
		yield(marker)
		yield(formatInline(formatChildren(n, no))...)
		yield(marker)
	case "em":
		marker := markerOr(n, "*")
		yield(marker)
		yield(formatInline(formatChildren(n, no))...)
		yield(marker)
	case "code":
		yield("`")
		yield(formatInline(formatValue(attributeOrUndefined(n, "content"), no))...)
		yield("`")
	case "s":
		yield("~~")
		yield(formatInline(formatChildren(n, no))...)
		yield("~~")
	case "hardbreak":
		yield(`\`+fmtNL, indent)
	case "softbreak":
		yield(fmtNL, indent)
	case "table":
		yield(formatTable(n, o, no, indent)...)
	case "thead":
		children := formatChildren(n, no)
		if len(children) > 0 {
			yield(children[0])
		} else {
			yield([]string{})
		}
	case "tr":
		var cells []string
		for _, p := range formatChildren(n, no) {
			cells = append(cells, pieceString(p))
		}
		if cells == nil {
			cells = []string{}
		}
		yield(cells)
	case "td", "th":
		pieces := append(formatChildren(n, no), formatAnnotations(n)...)
		yield(js.Trim(joinPieces(pieces)))
	case "tbody":
		yield(formatChildren(n, no)...)
	case "comment":
		yield("<!-- " + js.ToString(n.Attributes.Get("content")) + " -->\n")
	}
	return out
}

func markerOr(n *Node, fallback string) string {
	if m := n.Attributes.Get("marker"); !js.IsNullish(m) {
		return js.ToString(m)
	}
	return fallback
}

func listPrefix(n *Node, i int, o formatOptions) string {
	if !js.Truthy(n.Attributes.Get("ordered")) {
		return markerOr(n, fmtUL)
	}

	// Must be an ordered list now
	number := "1"
	var start any = 1.0
	if s := n.Attributes.Get("start"); !js.IsNullish(s) {
		start = s
	}
	if i == 0 {
		number = js.ToString(start)
	}
	if o.OrderedListMode == "increment" {
		number = js.FormatNumber(parseInt(js.ToString(start)) + float64(i))
	}
	return number + markerOr(n, fmtOL)
}

// parseInt is JS parseInt(s) for base 10.
func parseInt(s string) float64 {
	s = strings.TrimLeftFunc(s, js.IsWhitespace)
	sign := 1.0
	if strings.HasPrefix(s, "-") || strings.HasPrefix(s, "+") {
		if s[0] == '-' {
			sign = -1
		}
		s = s[1:]
	}
	end := 0
	for end < len(s) && s[end] >= '0' && s[end] <= '9' {
		end++
	}
	if end == 0 {
		return math.NaN()
	}
	f, _ := strconv.ParseFloat(s[:end], 64)
	return sign * f
}

func formatTable(n *Node, o, no formatOptions, indent string) []any {
	var out []any
	table := formatChildren(n, increment(no, 2))

	if o.parent != nil && o.parent.Type == "tag" && o.parent.Tag == "table" {
		for i, row := range table {
			// format tags like "if" in the middle of a table list
			if s, ok := row.(string); ok {
				if js.Trim(s) != "" {
					out = append(out, fmtNL, s)
				}
				continue
			}
			if i != 0 {
				out = append(out, fmtNL, indent+"---")
			}
			for _, d := range row.([]string) {
				out = append(out, fmtNL+indent+fmtUL+" "+d)
			}
		}
		return append(out, fmtNL)
	}

	rows := make([][]string, len(table))
	var widths []int
	for r, p := range table {
		row, ok := p.([]string)
		if !ok {
			row = strings.Split(p.(string), "")
		}
		rows[r] = row
		for i, cell := range row {
			w := utf16Len([]rune(cell))
			if i >= len(widths) {
				widths = append(widths, w)
			} else {
				widths[i] = max(widths[i], w)
			}
		}
	}
	if len(rows) == 0 {
		return nil
	}
	pad := func(row []string) []string {
		out := make([]string, len(row))
		for i, cell := range row {
			out[i] = cell + strings.Repeat(fmtSpace, widths[i]-utf16Len([]rune(cell)))
		}
		return out
	}
	head := rows[0]
	separator := make([]string, len(head))
	for i := range head {
		separator[i] = strings.Repeat("-", widths[i])
	}
	out = append(out, fmtNL, formatTableRow(pad(head)), fmtNL, formatTableRow(separator), fmtNL)
	for _, row := range rows[1:] {
		out = append(out, formatTableRow(pad(row)), fmtNL)
	}
	return out
}

func formatValue(v any, o formatOptions) []any {
	switch v := v.(type) {
	case nil, UndefinedType:
		return nil
	case string:
		return []any{v}
	case bool:
		return []any{strconv.FormatBool(v)}
	case []any:
		var out []any
		for _, x := range v {
			out = append(out, formatValue(x, o)...)
		}
		return out
	case []*Node:
		var out []any
		for _, x := range v {
			out = append(out, formatValue(x, o)...)
		}
		return out
	case *Function:
		if o.markdown {
			markdownErrorf("Cannot render an unresolved Function as Markdown")
		}
		return formatFunction(v)
	case *Node:
		if o.markdown {
			return formatMarkdownNode(v, o)
		}
		return formatNode(v, o)
	case *Variable:
		if o.markdown {
			markdownErrorf("Cannot render an unresolved Variable as Markdown")
		}
		return formatVariable(v)
	}
	if f, ok := js.ToNumber(v); ok {
		return []any{js.FormatNumber(f)}
	}
	return nil
}
