package markdoc

// Ports of packages/markdoc/src/tokenizer/plugins/{annotations,frontmatter}.ts
// as goldmark parsers.

import (
	"bytes"
	"regexp"
	"strings"

	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
	"markdoc.dev/markdoc/internal/js"
)

const (
	tagOpen  = "{%"
	tagClose = "%}"
)

// createToken builds a token from tag content, as annotations.ts does.
// contentStart is a UTF-16 offset, or nil when JS passes none.
func createToken(content string, contentStart *int) *mdToken {
	res, err := parseTagContent(content)
	if err == nil {
		return &mdToken{Type: res.Type, Nesting: res.Nesting, Info: content, Meta: metaFrom(res)}
	}
	se := err.(*syntaxError)
	var loc *Location
	// JS tests `contentStart ?`, so an offset of 0 also yields null.
	if contentStart != nil && *contentStart != 0 {
		loc = &Location{
			Start: LocationEdge{Offset: intp(se.Start + *contentStart)},
			End:   LocationEdge{Offset: intp(se.End + *contentStart)},
		}
	}
	return &mdToken{Type: "error", Meta: &tokenMeta{Error: &tokenError{Message: se.Message, Location: loc}}}
}

func metaFrom(res *tagResult) *tokenMeta {
	return &tokenMeta{Tag: res.Meta.Tag, Attributes: res.Meta.Attributes, Variable: res.Meta.Variable}
}

// findTagEnd mirrors utils.ts findTagEnd, returning -1 for null.
func findTagEnd(content string, start int) int {
	const (
		normal = iota
		str
		escape
	)
	state := normal
	for pos := start; pos < len(content); pos++ {
		ch := content[pos]
		switch state {
		case str:
			switch ch {
			case '"':
				state = normal
			case '\\':
				state = escape
			}
		case escape:
			state = str
		case normal:
			if ch == '"' {
				state = str
			} else if strings.HasPrefix(content[pos:], tagClose) {
				return pos
			}
		}
	}
	return -1
}

// utf16Offset converts a byte offset in s to a UTF-16 offset.
func utf16Offset(s string, byteOffset int) int {
	return utf16Len([]rune(s[:byteOffset]))
}

// blockTagEnd checks the annotations block rule's conditions for a tag at
// start: its end must be at or past the end of the line's content.
func blockTagEnd(src string, start int) (int, bool) {
	finish := len(src)
	if i := strings.IndexByte(src[start:], '\n'); i >= 0 {
		finish = start + i
	}
	tagEnd := findTagEnd(src, start)
	// JS trims src.slice(0, finish), so leading document whitespace counts.
	lastPossible := len(js.Trim(src[:finish]))
	if tagEnd < 0 || tagEnd < lastPossible-len(tagClose) {
		return 0, false
	}
	if strings.HasPrefix(js.Trim(jsSlice(src, start+len(tagOpen), tagEnd)), "$") {
		return 0, false
	}
	return tagEnd, true
}

// Block-level tags: the `annotations` block rule.

var kindAnnotationBlock = gast.NewNodeKind("MarkdocAnnotationBlock")

type annotationBlock struct {
	gast.BaseBlock
	token *mdToken
}

func (n *annotationBlock) Kind() gast.NodeKind { return kindAnnotationBlock }
func (n *annotationBlock) Dump(src []byte, level int) {
	gast.DumpHelper(n, src, level, map[string]string{"type": n.token.Type}, nil)
}

type annotationBlockParser struct{}

func (p *annotationBlockParser) Trigger() []byte { return []byte{'{'} }

func (p *annotationBlockParser) Open(parent gast.Node, reader text.Reader, pc parser.Context) (gast.Node, parser.State) {
	src := string(reader.Source())
	lineNum, seg := reader.Position()
	offset := pc.BlockOffset()
	if offset < 0 {
		// goldmark compares indentation width with the line's byte length,
		// so a short tab-indented line is wrongly treated as blank.
		line, _ := reader.PeekLine()
		_, offset = util.IndentWidth(line, reader.LineOffset())
	}
	start := seg.Start + offset
	if !strings.HasPrefix(src[start:], tagOpen) {
		return nil, parser.NoChildren
	}
	// markdown-it's paragraph rule treats lines indented 4+ columns as
	// continuations before it checks whether another block interrupts.
	// A table ends at such a line instead, and the tag starts a new block.
	// On a lazy line past a blockquote, markdown-it's blockquote rule checks
	// for a terminating tag without that indentation rule.
	if last := pc.LastOpenedBlock().Node; pc.BlockIndent() > 3 && gast.IsParagraph(last) &&
		tableBodyStart(reader.Source(), last.Lines()) == 0 && !lazyInBlockquote(last, parent) {
		return nil, parser.NoChildren
	}
	tagEnd, ok := blockTagEnd(src, start)
	if !ok {
		return nil, parser.NoChildren
	}

	lines := strings.Count(src[start:tagEnd+len(tagClose)], "\n") + 1
	// markdown-it reads the tag from getLines, which drops container
	// prefixes from the lines after the first.
	text := src[start:]
	if lines > 1 {
		raw := strings.SplitN(src[start:], "\n", lines+1)[:lines]
		for i := 1; i < len(raw); i++ {
			if stripped, ok := stripContainers(raw[i], parent); ok {
				raw[i] = stripped
			}
		}
		text = strings.Join(raw, "\n")
	}
	contentEnd := findTagEnd(text, 0)
	if contentEnd < 0 {
		return nil, parser.NoChildren
	}
	content := js.Trim(jsSlice(text, len(tagOpen), contentEnd))
	if strings.HasPrefix(content, "$") {
		return nil, parser.NoChildren
	}

	contentStart := utf16Offset(src, start+len(tagOpen))
	token := createToken(content, &contentStart)
	token.Map = []int{lineNum, lineNum + lines}
	// markdown-it skips the tag's lines whatever they contain, even lines
	// that would end the enclosing container, so consume them here.
	for i := 1; i < lines; i++ {
		reader.AdvanceLine()
	}
	return &annotationBlock{token: token}, parser.NoChildren
}

func (p *annotationBlockParser) Continue(gast.Node, text.Reader, parser.Context) parser.State {
	return parser.Close
}

func (p *annotationBlockParser) Close(gast.Node, text.Reader, parser.Context) {}
func (p *annotationBlockParser) CanInterruptParagraph() bool                  { return true }
func (p *annotationBlockParser) CanAcceptIndentedLine() bool                  { return true }

// lazyInBlockquote reports whether a line continuing paragraph p from
// parent passes over a blockquote that did not continue.
func lazyInBlockquote(p, parent gast.Node) bool {
	for n := p.Parent(); n != nil && n != parent; n = n.Parent() {
		if _, ok := n.(*gast.Blockquote); ok {
			return true
		}
	}
	return false
}

// Inline tags: the `containers` inline rule.

var kindAnnotationInline = gast.NewNodeKind("MarkdocAnnotationInline")

type annotationInline struct {
	gast.BaseInline
	token *mdToken
}

func (n *annotationInline) Kind() gast.NodeKind { return kindAnnotationInline }
func (n *annotationInline) Dump(src []byte, level int) {
	gast.DumpHelper(n, src, level, map[string]string{"type": n.token.Type}, nil)
}

type annotationInlineParser struct{}

func (p *annotationInlineParser) Trigger() []byte { return []byte{'{'} }

func (p *annotationInlineParser) Parse(parent gast.Node, block text.Reader, pc parser.Context) gast.Node {
	line, _ := block.PeekLine()
	if !bytes.HasPrefix(line, []byte(tagOpen)) {
		return nil
	}
	// Tags may span lines, so scan across the block's remaining lines.
	savedLine, savedSeg := block.Position()
	var buf strings.Builder
	for {
		buf.Write(line)
		if end := findTagEnd(buf.String(), 0); end >= 0 {
			content := jsSlice(buf.String(), len(tagOpen), end)
			// Advance to just past the closing delimiter on the current line.
			consumed := len(line) - (buf.Len() - (end + len(tagClose)))
			block.Advance(consumed)
			token := createToken(js.Trim(content), nil)
			scopesFor(parent, pc).push(token.Nesting)
			return &annotationInline{token: token}
		}
		block.AdvanceLine()
		next, _ := block.PeekLine()
		if next == nil {
			block.SetPosition(savedLine, savedSeg)
			return nil
		}
		line = next
	}
}

// Frontmatter

var kindFrontmatter = gast.NewNodeKind("MarkdocFrontmatter")

type frontmatterBlock struct {
	gast.BaseBlock
	token     *mdToken
	remaining int
}

func (n *frontmatterBlock) Kind() gast.NodeKind        { return kindFrontmatter }
func (n *frontmatterBlock) Dump(src []byte, level int) { gast.DumpHelper(n, src, level, nil, nil) }

type frontmatterParser struct{}

func (p *frontmatterParser) Trigger() []byte { return []byte{'-'} }

func (p *frontmatterParser) Open(parent gast.Node, reader text.Reader, _ parser.Context) (gast.Node, parser.State) {
	lineNum, _ := reader.Position()
	if lineNum != 0 || parent.Kind() != gast.KindDocument {
		return nil, parser.NoChildren
	}
	src := string(reader.Source())
	starts := lineStarts(reader.Source())
	lineMax := countLines(reader.Source())
	get := func(n int) (string, int, int) {
		b := starts[n]
		e := len(src)
		if n+1 < len(starts) {
			e = starts[n+1] - 1
		}
		return js.Trim(src[b:e]), b, e
	}
	if l, _, _ := get(0); l != "---" {
		return nil, parser.NoChildren
	}
	_, _, firstEnd := get(0)
	for closing := 1; closing < lineMax; closing++ {
		if l, b, _ := get(closing); l == "---" {
			token := &mdToken{Type: "frontmatter", Content: js.Trim(src[firstEnd:b]), Map: []int{0, closing}, Hidden: true}
			return &frontmatterBlock{token: token, remaining: closing}, parser.NoChildren
		}
	}
	return nil, parser.NoChildren
}

func (p *frontmatterParser) Continue(node gast.Node, _ text.Reader, _ parser.Context) parser.State {
	n := node.(*frontmatterBlock)
	if n.remaining > 0 {
		n.remaining--

		return parser.Continue | parser.NoChildren
	}
	return parser.Close
}

func (p *frontmatterParser) Close(gast.Node, text.Reader, parser.Context) {}
func (p *frontmatterParser) CanInterruptParagraph() bool                  { return false }
func (p *frontmatterParser) CanAcceptIndentedLine() bool                  { return false }

// countLines counts lines the way markdown-it's StateBlock does.
func countLines(src []byte) int {
	if len(src) == 0 {
		return 0
	}
	n := bytes.Count(src, []byte{'\n'})
	// A last line without a newline counts unless it is only spaces and
	// tabs: StateBlock's indentation scan skips its end-of-input check.
	last := src[bytes.LastIndexByte(src, '\n')+1:]
	if len(bytes.Trim(last, " \t")) > 0 {
		n++
	}
	return n
}

// annotateFences is the annotations plugin's core rule.
func annotateFences(tokens []*mdToken) {
	for _, t := range tokens {
		if t.Type != "fence" || t.Map == nil {
			continue
		}
		if start := strings.Index(t.Info, tagOpen); start >= 0 {
			end := findTagEnd(t.Info, start)
			content := t.Info[start+len(tagOpen):]
			if end >= 0 {
				content = jsSlice(t.Info, start+len(tagOpen), end)
			}
			res, err := parseTagContent(js.Trim(content))
			if err != nil {
				t.Errors = append(t.Errors, ValidationError{
					ID: "fence-tag-error", Level: LevelError,
					Message: "Syntax error in fence tag: " + err.Error(),
				})
			} else {
				t.Meta = metaFrom(res)
			}
		}
		if t.Meta != nil {
			skip := false
			for _, a := range t.Meta.Attributes {
				if a.Name == "process" && !js.Truthy(a.Value) {
					skip = true
				}
			}
			if skip {
				continue
			}
		}
		t.Children = parseTags(t.Content, t.Map[0])
	}
}

// parseTags mirrors utils.ts parseTags. Positions are UTF-16 offsets.
func parseTags(content string, firstLine int) []*mdToken {
	line := firstLine + 1
	var output []*mdToken
	start := 0
	u := func(b int) int { return utf16Offset(content, b) }

	for pos := 0; pos < len(content); pos++ {
		if content[pos] == '\n' {
			line++
			continue
		}
		if !strings.HasPrefix(content[pos:], tagOpen) {
			continue
		}
		end := findTagEnd(content, pos)
		if end < 0 {
			pos += len(tagOpen)
			continue
		}

		text := content[pos : end+len(tagClose)]
		inner := jsSlice(content, pos+len(tagOpen), end)
		lineStart := strings.LastIndex(content[:pos+1], "\n")
		lineEnd := strings.Index(content[end:], "\n")
		if lineEnd >= 0 {
			lineEnd += end
		}
		lineContent := jsSlice(content, lineStart, lineEnd)

		lineStartU := -1
		if lineStart >= 0 {
			lineStartU = u(lineStart)
		}
		contentStart := u(pos) - lineStartU
		tag := parseTagToken(js.Trim(inner), line, contentStart)

		precedingTextEnd := pos
		if js.Trim(lineContent) == text {
			precedingTextEnd = lineStart
		}
		output = append(output, &mdToken{Type: "text", Content: jsSlice(content, start, precedingTextEnd)})

		tag.Map = []int{line, line + 1}
		tag.Position = &[2]int{contentStart, contentStart + utf16Len([]rune(text))}
		tag.Info = text
		output = append(output, tag)

		start = end + len(tagClose)
		pos = start - 1
	}
	output = append(output, &mdToken{Type: "text", Content: content[start:]})
	return output
}

func parseTagToken(content string, line, contentStart int) *mdToken {
	res, err := parseTagContent(content)
	if err == nil {
		return &mdToken{Type: res.Type, Nesting: res.Nesting, Meta: metaFrom(res)}
	}
	se := err.(*syntaxError)
	return &mdToken{Type: "error", Meta: &tokenMeta{Error: &tokenError{
		Message: se.Message,
		Location: &Location{
			Start: LocationEdge{Line: intp(line), Character: intp(se.Start + contentStart)},
			End:   LocationEdge{Line: intp(line + 1), Character: intp(se.End + contentStart)},
		},
	}}}
}

// jsSlice implements String.prototype.slice on byte offsets, where -1
// stands for JS's negative indices counted from the end.
func jsSlice(s string, start, end int) string {
	n := len(s)
	norm := func(i int) int {
		if i < 0 {
			i += n
			if i < 0 {
				i = 0
			}
		}
		if i > n {
			i = n
		}
		return i
	}
	a, b := norm(start), norm(end)
	if a >= b {
		return ""
	}
	return s[a:b]
}

// Code spans: markdown-it's `backticks` rule. markdown-it keeps the
// indentation of continuation lines in inline content, so the content is
// rebuilt from the source rather than goldmark's trimmed line segments.

var kindCodeSpan = gast.NewNodeKind("MarkdocCodeSpan")

type codeSpan struct {
	gast.BaseInline
	content, markup string
}

func (n *codeSpan) Kind() gast.NodeKind        { return kindCodeSpan }
func (n *codeSpan) Dump(src []byte, level int) { gast.DumpHelper(n, src, level, nil, nil) }

type codeSpanParser struct{}

func (p *codeSpanParser) Trigger() []byte { return []byte{'`'} }

func (p *codeSpanParser) Parse(parent gast.Node, block text.Reader, _ parser.Context) gast.Node {
	src := block.Source()
	line, seg := block.PeekLine()
	opener := 0
	for opener < len(line) && line[opener] == '`' {
		opener++
	}
	savedLine, savedSeg := block.Position()
	block.Advance(opener)

	var content strings.Builder
	first := true
	for {
		line, seg = block.PeekLine()
		if line == nil {
			block.SetPosition(savedLine, savedSeg)
			block.Advance(opener)
			return gast.NewTextSegment(savedSeg.WithStop(savedSeg.Start + opener))
		}
		if !first {
			content.WriteString(continuationIndent(src, seg.Start, parent))
		}
		first = false
		for i := 0; i < len(line); i++ {
			if line[i] != '`' {
				continue
			}
			j := i
			for j < len(line) && line[j] == '`' {
				j++
			}
			if j-i == opener {
				content.Write(line[:i])
				block.Advance(j)
				return &codeSpan{content: codeSpanContent(content.String()), markup: strings.Repeat("`", opener)}
			}
			i = j - 1
		}
		content.Write(line)
		block.AdvanceLine()
	}
}

// codeSpanContent applies markdown-it's normalization of code span content.
func codeSpanContent(s string) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) >= 3 && s[0] == ' ' && s[len(s)-1] == ' ' {
		return s[1 : len(s)-1]
	}
	return s
}

// continuationIndent returns the whitespace goldmark stripped from the start
// of a continuation line, less the enclosing list item's content offset,
// which markdown-it strips as block indentation.
func continuationIndent(src []byte, start int, parent gast.Node) string {
	return indentBefore(src, start, start, parent)
}

// lineIndent returns the indentation around a line segment's start, which
// goldmark may or may not have stripped, less the list item offset.
func lineIndent(src []byte, start int, parent gast.Node) string {
	e := start
	for e < len(src) && (src[e] == ' ' || src[e] == '\t') {
		e++
	}
	return indentBefore(src, start, e, parent)
}

func indentBefore(src []byte, start, end int, parent gast.Node) string {
	b := start
	for b > 0 && (src[b-1] == ' ' || src[b-1] == '\t') {
		b--
	}
	ws := string(src[b:end])
	for n := parent; n != nil; n = n.Parent() {
		if item, ok := n.(*gast.ListItem); ok {
			cut := item.Offset
			if cut > len(ws) {
				cut = len(ws)
			}
			ws = ws[cut:]
			break
		}
	}
	return ws
}

// markdown-it's reference rule rejects definitions indented 4+ columns, and
// with indented code disabled such lines start a paragraph instead.
type linkReferenceTransformer struct{}

func (linkReferenceTransformer) Transform(node *gast.Paragraph, reader text.Reader, pc parser.Context) {
	lines := node.Lines()
	if lines.Len() > 0 {
		first := lines.At(0)
		if len(lineIndent(reader.Source(), first.Start, node.Parent())) > 3 {
			return
		}
	}
	if invalidFirstReference(reader.Source(), lines) {
		return
	}
	parser.LinkReferenceParagraphTransformer.Transform(node, reader, pc)
}

var referenceLabelRe = regexp.MustCompile(`^\[(?:[^\]\\]|\\.)+\]:`)

// invalidFirstReference reports whether the paragraph starts with a link
// reference definition whose destination markdown-it's validateLink
// refuses. markdown-it's reference rule then fails and the lines stay a
// paragraph. Later definitions in the same paragraph are not checked.
func invalidFirstReference(src []byte, lines *text.Segments) bool {
	var b bytes.Buffer
	for i := 0; i < lines.Len(); i++ {
		seg := lines.At(i)
		b.Write(seg.Value(src))
	}
	m := referenceLabelRe.Find(b.Bytes())
	if m == nil {
		return false
	}
	dest, ok := linkDestination(b.Bytes()[len(m):])
	return ok && dest != "" && !validateLink(normalizeLink(unescapeAll(dest)))
}

var alignRe = regexp.MustCompile(`^:?-+:?$`)

func escapedSplit(s string) []string {
	var result []string
	var current strings.Builder
	last, escaped := 0, false
	for pos := 0; pos < len(s); pos++ {
		if s[pos] == '|' {
			if !escaped {
				result = append(result, current.String()+s[last:pos])
				current.Reset()
				last = pos + 1
			} else {
				current.WriteString(s[last : pos-1])
				last = pos
			}
		}
		escaped = s[pos] == '\\'
	}
	return append(result, current.String()+s[last:])
}

var delimiterRowRe = regexp.MustCompile(`^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$`)

// tableBodyStart returns the index of the first body row of a table in the
// paragraph's lines, or 0 when the lines hold no table.
func tableBodyStart(src []byte, lines *text.Segments) int {
	for i := 1; i < lines.Len(); i++ {
		delim, header := lines.At(i), lines.At(i-1)
		if delimiterRowRe.Match(delim.Value(src)) && bytes.ContainsRune(header.Value(src), '|') {
			return i + 1
		}
	}
	return 0
}

func indentWidth(ws string) int {
	w := 0
	for _, ch := range ws {
		if ch == '\t' {
			w += 4 - w%4
		} else {
			w++
		}
	}
	return w
}

// linkParser rejects inline links and images whose destination markdown-it's
// validateLink refuses. markdown-it's link rule then fails, so the brackets
// and destination stay text, which goldmark does when its parser declines.
type linkParser struct{ parser.InlineParser }

func (p *linkParser) Parse(parent gast.Node, block text.Reader, pc parser.Context) gast.Node {
	if line, _ := block.PeekLine(); len(line) > 1 && line[0] == ']' && line[1] == '(' {
		if dest, ok := linkDestination(line[2:]); ok && !validateLink(normalizeLink(unescapeAll(dest))) {
			return nil
		}
	}
	return p.InlineParser.Parse(parent, block, pc)
}

// CloseBlock forwards to goldmark's link parser, which turns unmatched
// brackets back into text.
func (p *linkParser) CloseBlock(parent gast.Node, block text.Reader, pc parser.Context) {
	if cb, ok := p.InlineParser.(parser.CloseBlocker); ok {
		cb.CloseBlock(parent, block, pc)
	}
}

// linkDestination scans a destination as markdown-it's parseLinkDestination
// does, after the opening parenthesis and any whitespace.
func linkDestination(s []byte) (string, bool) {
	i := 0
	for i < len(s) && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n') {
		i++
	}
	if i < len(s) && s[i] == '<' {
		for j := i + 1; j < len(s); j++ {
			switch s[j] {
			case '\n', '<':
				return "", false
			case '>':
				return string(s[i+1 : j]), true
			case '\\':
				j++
			}
		}
		return "", false
	}
	level, start := 0, i
	for ; i < len(s); i++ {
		c := s[i]
		if c == ' ' || c < 0x20 || c == 0x7F {
			break
		}
		if c == '\\' && i+1 < len(s) {
			i++
			continue
		}
		if c == '(' {
			level++
			if level > 32 {
				return "", false
			}
		}
		if c == ')' {
			if level == 0 {
				break
			}
			level--
		}
	}
	return string(s[start:i]), level == 0
}
