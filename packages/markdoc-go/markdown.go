package markdoc

// The formatter's Markdown output, which renderers/md uses through
// internal/markdown.

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"markdoc.dev/markdoc/internal/js"
	"markdoc.dev/markdoc/internal/markdown"
)

func init() { markdown.Format = formatMarkdown }

// markdownError is panicked by the Markdown formatter and recovered by
// formatMarkdown, so errors needn't be returned through every call.
type markdownError struct{ error }

func markdownErrorf(format string, args ...any) {
	panic(markdownError{fmt.Errorf(format, args...)})
}

// formatMarkdown serializes a Markdown AST, as produced by the Markdown
// renderer, to CommonMark/GFM. Unlike Format, literal text is escaped so
// that it keeps its meaning, and Markdoc-only syntax is an error.
func formatMarkdown(v any) (s string, err error) {
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(markdownError)
			if !ok {
				panic(p)
			}
			err = e.error
		}
	}()
	o := formatOptions{markdown: true}
	o.OrderedListMode = "increment"
	return format(v, o), nil
}

func mdtype(v any) string {
	switch v.(type) {
	case *Node:
		return "Node"
	case *Variable:
		return "Variable"
	case *Function:
		return "Function"
	}
	return ""
}

// isEntityAt reports whether s[i:] starts with an entity or numeric
// character reference, which /&(?=#[0-9]{1,7};|#[xX][0-9a-fA-F]{1,6};|
// [A-Za-z][A-Za-z0-9]*;)/ matches the & of.
func isEntityAt(s string, i int) bool {
	rest := s[i+1:]
	run := func(s string, ok func(byte) bool) int {
		n := 0
		for n < len(s) && ok(s[n]) {
			n++
		}
		return n
	}
	isDigit := func(c byte) bool { return c >= '0' && c <= '9' }
	isHex := func(c byte) bool { return isDigit(c) || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F' }
	isAlnum := func(c byte) bool { return isDigit(c) || js.IsASCIILetter(c) }
	switch {
	case strings.HasPrefix(rest, "#x") || strings.HasPrefix(rest, "#X"):
		n := run(rest[2:], isHex)
		return 1 <= n && n <= 6 && strings.HasPrefix(rest[2+n:], ";")
	case strings.HasPrefix(rest, "#"):
		n := run(rest[1:], isDigit)
		return 1 <= n && n <= 7 && strings.HasPrefix(rest[1+n:], ";")
	case rest != "" && js.IsASCIILetter(rest[0]):
		n := run(rest, isAlnum)
		return strings.HasPrefix(rest[n:], ";")
	}
	return false
}

// escapeEntities escapes the & of entity and character references.
func escapeEntities(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '&' && isEntityAt(s, i) {
			b.WriteByte('\\')
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

func isJSSpaceAt(s string, i int) bool {
	r, _ := utf8.DecodeRuneInString(s[i:])
	return i < len(s) && js.IsWhitespace(r)
}

// escapeLineStart escapes what would start an ATX heading, list item,
// thematic break, setext underline or blockquote at the start of a line.
func escapeLineStart(line string) string {
	// /^#(?=#{0,5}(\s|$))/
	if strings.HasPrefix(line, "#") {
		n := len(line) - len(strings.TrimLeft(line, "#"))
		if n <= 6 && (n == len(line) || isJSSpaceAt(line, n)) {
			line = `\` + line
		}
	}
	// /^([-+])(?=\s|$)/
	if (strings.HasPrefix(line, "-") || strings.HasPrefix(line, "+")) && (len(line) == 1 || isJSSpaceAt(line, 1)) {
		line = `\` + line
	}
	// /^-(?=[-\s]*$)/
	if strings.HasPrefix(line, "-") && strings.TrimFunc(line, func(r rune) bool { return r == '-' || js.IsWhitespace(r) }) == "" {
		line = `\` + line
	}
	// /^=(?==*\s*$)/
	if strings.HasPrefix(line, "=") && strings.TrimRightFunc(strings.TrimLeft(line, "="), js.IsWhitespace) == "" {
		line = `\` + line
	}
	// /^>/
	if strings.HasPrefix(line, ">") {
		line = `\` + line
	}
	// /^(\d{1,9})([.)])(?=\s|$)/
	n := len(line) - len(strings.TrimLeft(line, "0123456789"))
	if 1 <= n && n <= 9 && n < len(line) && (line[n] == '.' || line[n] == ')') && (n+1 == len(line) || isJSSpaceAt(line, n+1)) {
		line = line[:n] + `\` + line[n:]
	}
	return line
}

func isLetterOrNumber(r rune) bool { return unicode.IsLetter(r) || unicode.IsNumber(r) }

// splitLines splits s at /[ \t]*\r?\n\s*/.
func splitLines(s string) []string {
	var lines []string
	for {
		i := strings.IndexByte(s, '\n')
		if i < 0 {
			return append(lines, s)
		}
		line := strings.TrimSuffix(s[:i], "\r")
		lines = append(lines, strings.TrimRight(line, " \t"))
		s = strings.TrimLeftFunc(s[i+1:], js.IsWhitespace)
	}
}

func escapeMarkdownText(s string, o formatOptions) string {
	var b strings.Builder
	runes := []rune(s)
	for i, r := range runes {
		switch {
		case strings.ContainsRune("\\`*~[]<|", r):
			b.WriteByte('\\')
		case r == '_':
			// Intraword underscores cannot delimit emphasis
			if i == 0 || !isLetterOrNumber(runes[i-1]) || i == len(runes)-1 || !isLetterOrNumber(runes[i+1]) {
				b.WriteByte('\\')
			}
		}
		b.WriteRune(r)
	}
	s = escapeEntities(b.String())
	s = strings.ReplaceAll(s, tagOpen, `\`+tagOpen)
	// Newlines are whitespace; never emit blank lines or indented code
	lines := splitLines(s)
	for i, line := range lines {
		lines[i] = escapeLineStart(line)
	}
	separator := fmtSpace
	if !o.singleLine {
		separator = fmtNL + strings.Repeat(fmtSpace, o.indent)
	}
	return escapeNBSP(strings.Join(lines, separator))
}

func escapeLinkField(s, chars string) string {
	var b strings.Builder
	for _, r := range s {
		if strings.ContainsRune(chars, r) {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	return escapeEntities(b.String())
}

func isSpaceOrControl(r rune) bool { return js.IsWhitespace(r) || unicode.Is(unicode.Cc, r) }

func formatDestination(url string) string {
	// Destinations containing whitespace or control characters need <...>
	if url == "" || strings.ContainsFunc(url, isSpaceOrControl) {
		escaped := escapeLinkField(url, `\<>|`)
		return "<" + strings.NewReplacer("\r", "%0D", "\n", "%0A").Replace(escaped) + ">"
	}
	return escapeLinkField(url, `\<>()|`)
}

// collapseNewlines replaces each match of /\s*\n\s*/ with a space.
func collapseNewlines(s string) string {
	var b strings.Builder
	for {
		i := strings.IndexByte(s, '\n')
		if i < 0 {
			b.WriteString(s)
			return b.String()
		}
		b.WriteString(strings.TrimRightFunc(s[:i], js.IsWhitespace) + fmtSpace)
		s = strings.TrimLeftFunc(s[i+1:], js.IsWhitespace)
	}
}

func formatTitle(title any) string {
	if js.IsNullish(title) || title == "" {
		return ""
	}
	escaped := escapeLinkField(js.ToString(title), `\"|`)
	return fmtSpace + `"` + collapseNewlines(escaped) + `"`
}

func formatCodeSpan(content string, o formatOptions) string {
	content = strings.ReplaceAll(strings.ReplaceAll(content, "\r\n", fmtSpace), fmtNL, fmtSpace)
	// GFM splits table cells and unescapes `\|` before parsing code spans.
	// Other backslashes stay literal in code, so escaping them would change
	// the code.
	if o.tableCell {
		content = strings.ReplaceAll(content, "|", `\|`)
	}
	if content == "" {
		return ""
	}

	runs := map[int]bool{}
	for i := 0; i < len(content); {
		j := i
		for j < len(content) && content[j] == '`' {
			j++
		}
		if j > i {
			runs[j-i] = true
			i = j
		} else {
			i++
		}
	}
	length := 1
	for runs[length] {
		length++
	}
	delimiter := strings.Repeat("`", length)

	// https://spec.commonmark.org/0.31.2/#code-spans strips one space from
	// each side, so pad content that would otherwise be changed or ambiguous
	pad := ""
	if strings.HasPrefix(content, "`") || strings.HasSuffix(content, "`") ||
		len(content) >= 3 && content[0] == ' ' && content[len(content)-1] == ' ' && strings.Trim(content, " ") != "" {
		pad = fmtSpace
	}
	return delimiter + pad + content + pad + delimiter
}

func formatMarkdownCell(cell *Node, o formatOptions) string {
	o.indent, o.singleLine, o.tableCell = 0, true, true
	return js.Trim(collapseNewlines(joinPieces(formatChildren(cell, o))))
}

var alignments = map[string]string{"left": ":---", "center": ":---:", "right": "---:"}

func formatMarkdownTable(n *Node, o formatOptions) []any {
	indent := strings.Repeat(fmtSpace, o.indent)
	rows := func(typ string) []*Node {
		var out []*Node
		for _, section := range n.Children {
			if section.Type == typ {
				out = append(out, section.Children...)
			}
		}
		return out
	}

	var headRow *Node
	bodyRows := rows("thead")
	if len(bodyRows) > 0 {
		headRow, bodyRows = bodyRows[0], bodyRows[1:]
	}
	bodyRows = append(bodyRows, rows("tbody")...)
	columns := 0
	for _, row := range append([]*Node{headRow}, bodyRows...) {
		if row != nil {
			columns = max(columns, len(row.Children))
		}
	}
	if columns == 0 {
		return nil
	}

	cell := func(row *Node, i int) *Node {
		if row == nil || i >= len(row.Children) {
			return nil
		}
		return row.Children[i]
	}
	line := func(row func(i int) string) string {
		items := make([]string, columns)
		for i := range items {
			items[i] = row(i)
		}
		return indent + "| " + strings.Join(items, " | ") + " |" + fmtNL
	}
	cells := func(row *Node) string {
		return line(func(i int) string {
			if c := cell(row, i); c != nil {
				return formatMarkdownCell(c, o)
			}
			return ""
		})
	}
	var firstBody *Node
	if len(bodyRows) > 0 {
		firstBody = bodyRows[0]
	}
	alignment := line(func(i int) string {
		c := cell(headRow, i)
		if c == nil {
			c = cell(firstBody, i)
		}
		if c != nil {
			if align, ok := alignments[js.ToString(c.Attributes.Get("align"))]; ok {
				return align
			}
		}
		return "---"
	})

	out := []any{fmtNL, cells(headRow), alignment}
	for _, row := range bodyRows {
		out = append(out, cells(row))
	}
	return out
}

// escapeClosingSequence escapes a trailing run of # after whitespace,
// /(\s)(#+)$/, which would be read as a heading's closing sequence.
func escapeClosingSequence(s string) string {
	run := strings.TrimRight(s, "#")
	if r, _ := utf8.DecodeLastRuneInString(run); len(run) < len(s) && js.IsWhitespace(r) {
		return run + `\` + s[len(run):]
	}
	return s
}

func formatMarkdownNode(n *Node, o formatOptions) []any {
	no := o
	no.parent = n
	indent := strings.Repeat(fmtSpace, no.indent)

	if len(n.Annotations) > 0 {
		markdownErrorf("Cannot render Markdoc annotations as Markdown")
	}
	for _, k := range n.Attributes.Keys() {
		if v := n.Attributes.Get(k); isAst(v) {
			markdownErrorf("Cannot render an unresolved %s as Markdown", mdtype(v))
		}
	}
	str := func(k string) string {
		if v := n.Attributes.Get(k); !js.IsNullish(v) {
			return js.ToString(v)
		}
		return ""
	}

	var out []any
	yield := func(pieces ...any) { out = append(out, pieces...) }
	switch n.Type {
	case "heading":
		so := no
		so.singleLine = true
		content := strings.TrimRightFunc(joinPieces(trimStart(formatChildren(n, so))), js.IsWhitespace)
		content = escapeClosingSequence(content)
		level := 1
		if f, ok := js.ToNumber(n.Attributes.Get("level")); ok && f != 0 {
			level = int(f)
		}
		yield(fmtNL, indent, strings.Repeat("#", max(level, 0)))
		if content != "" {
			yield(fmtSpace + content)
		}
		yield(fmtNL)
	case "paragraph":
		if content := joinPieces(formatChildren(n, no)); js.Trim(content) != "" {
			yield(fmtNL + content + fmtNL)
		}
	case "inline":
		yield(indent)
		yield(trimStart(formatChildren(n, no))...)
	case "text":
		yield(escapeMarkdownText(str("content"), no))
	case "strong", "em", "s":
		marker := "~~"
		if n.Type != "s" {
			marker = markerOr(n, map[string]string{"strong": "**", "em": "*"}[n.Type])
		}
		inner := joinPieces(formatChildren(n, no))
		content := js.Trim(inner)
		if content == "" {
			yield(inner)
			break
		}
		// Emphasis cannot begin or end with whitespace, so move it outside
		start := len(inner) - len(strings.TrimLeftFunc(inner, js.IsWhitespace))
		yield(inner[:start], marker+content+marker, inner[start+len(content):])
	case "code":
		yield(formatCodeSpan(str("content"), no))
	case "link":
		text := joinPieces(formatChildren(n, no))
		href := str("href")
		title := formatTitle(n.Attributes.Get("title"))
		if title == "" && text == href && isAutolink(href) {
			yield("<" + href + ">")
			break
		}
		yield("[" + text + "](" + formatDestination(href) + title + ")")
	case "image":
		ao := no
		ao.singleLine = true
		alt := escapeMarkdownText(str("alt"), ao)
		yield("![" + alt + "](" + formatDestination(str("src")) + formatTitle(n.Attributes.Get("title")) + ")")
	case "fence":
		// /[`\s]+/ becomes a space, and the result is trimmed
		language := strings.Join(strings.FieldsFunc(str("language"), func(r rune) bool { return r == '`' || js.IsWhitespace(r) }), fmtSpace)
		yield(formatNode(NewNode("fence", attrsOf("content", str("content"), "language", language), nil, ""), no)...)
	case "table":
		yield(formatMarkdownTable(n, no)...)
	case "hardbreak":
		if no.singleLine {
			yield(fmtSpace)
		} else {
			yield(`\` + fmtNL + indent)
		}
	case "softbreak":
		if no.singleLine {
			yield(fmtSpace)
		} else {
			yield(fmtNL + indent)
		}
	case "document", "blockquote", "list", "item", "hr":
		yield(formatNode(n, o)...)
	default:
		markdownErrorf("Cannot render a %q node as Markdown", n.Type)
	}
	return out
}

// autolinkSchemeRe matches the scheme of /^[A-Za-z][A-Za-z0-9+.-]{1,31}:
// [^\s<>\p{Cc}]*$/u, the absolute URIs that can be written as autolinks.
var autolinkSchemeRe = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9+.-]{1,31}:`)

func isAutolink(href string) bool {
	scheme := autolinkSchemeRe.FindString(href)
	return scheme != "" && !strings.ContainsFunc(href[len(scheme):], func(r rune) bool {
		return r == '<' || r == '>' || isSpaceOrControl(r)
	})
}

func attrsOf(kv ...any) *OrderedMap {
	m := NewOrderedMap()
	for i := 0; i < len(kv); i += 2 {
		m.Set(kv[i].(string), kv[i+1])
	}
	return m
}
