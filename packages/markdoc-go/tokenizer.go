package markdoc

// The tokenizer runs goldmark, configured to match the markdown-it setup in
// packages/markdoc/src/tokenizer, and flattens its AST into markdown-it's token
// stream so parser.go can follow parser.ts line for line.

import (
	"strconv"
	"strings"

	gast "github.com/yuin/goldmark/ast"
	east "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

// Token mirrors markdown-it's Token, plus the fields Markdoc adds.
type mdToken struct {
	Type     string
	Tag      string
	Nesting  int
	Map      []int // nil when markdown-it leaves it null
	Content  string
	Markup   string
	Info     string
	Attrs    [][2]any
	Meta     *tokenMeta
	Hidden   bool
	Children []*mdToken // nil unless the token has children (inline, fence)
	Errors   []ValidationError

	Position *[2]int
	// Variable content for `variable` tokens.
	Variable any
}

type tokenMeta struct {
	Tag        string
	Attributes []AttributeValue
	Variable   any
	Error      *tokenError
}

type tokenError struct {
	Message  string
	Location *Location
}

func (t *mdToken) attr(name string) (any, bool) {
	for _, a := range t.Attrs {
		if a[0] == name {
			return a[1], true
		}
	}
	return nil, false
}

// mdTokenizer produces markdown-it tokens using goldmark. Only markdown-it's
// default options are implemented.
type mdTokenizer struct {
	parser parser.Parser
}

func newTokenizer() *mdTokenizer {
	p := parser.NewParser(
		parser.WithBlockParsers(
			util.Prioritized(recorded(&tableParser{}), 50),
			util.Prioritized(recorded(&frontmatterParser{}), 100),
			util.Prioritized(recorded(parser.NewThematicBreakParser()), 200),
			util.Prioritized(recorded(parser.NewListParser()), 300),
			util.Prioritized(recorded(parser.NewListItemParser()), 400),
			util.Prioritized(recorded(parser.NewATXHeadingParser()), 600),
			util.Prioritized(recorded(parser.NewFencedCodeBlockParser()), 700),
			util.Prioritized(recorded(parser.NewBlockquoteParser()), 800),
			util.Prioritized(recorded(&annotationBlockParser{}), 950),
			util.Prioritized(recorded(&indentedParagraphParser{parser.NewParagraphParser()}), 1000),
		),
		parser.WithInlineParsers(
			util.Prioritized(&codeSpanParser{}, 100),
			util.Prioritized(&linkParser{parser.NewLinkParser()}, 200),
			util.Prioritized(parser.NewAutoLinkParser(), 300),
			util.Prioritized(&delimiterParser{char: '*'}, 500),
			util.Prioritized(&delimiterParser{char: '_'}, 501),
			util.Prioritized(&delimiterParser{char: '~'}, 502),
			util.Prioritized(&annotationInlineParser{}, 900),
		),
		parser.WithParagraphTransformers(
			util.Prioritized(linkReferenceTransformer{}, 100),
		),
	)
	return &mdTokenizer{parser: p}
}

// normalize matches markdown-it's `normalize` core rule.
func normalize(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = strings.ReplaceAll(s, "\x00", "�")
	// markdown-it never counts a final line of only spaces and tabs.
	if i := strings.LastIndexByte(s, '\n'); strings.Trim(s[i+1:], " \t") == "" {
		s = s[:i+1]
	}
	return s
}

func (t *mdTokenizer) tokenize(content string) []*mdToken {
	src := []byte(normalize(content))
	pc := parser.NewContext()
	rec := &lineRecorder{ends: map[gast.Node]int{}}
	pc.Set(recorderKey, rec)
	doc := t.parser.Parse(text.NewReader(src), parser.WithContext(pc))

	c := &converter{src: src, rec: rec, ends: map[gast.Node]int{}, lineStarts: lineStarts(src)}
	c.blocks(doc)
	c.markTight()
	annotateFences(c.tokens)
	return c.tokens
}

func lineStarts(src []byte) []int {
	starts := []int{0}
	for i, b := range src {
		if b == '\n' {
			starts = append(starts, i+1)
		}
	}
	return starts
}

// lineOf returns the zero-based line containing a byte offset.
func (c *converter) lineOf(offset int) int {
	lo, hi := 0, len(c.lineStarts)-1
	for lo < hi {
		mid := (lo + hi + 1) / 2
		if c.lineStarts[mid] <= offset {
			lo = mid
		} else {
			hi = mid - 1
		}
	}
	return lo
}

// Line recording: goldmark does not keep line ranges for container blocks, so
// every block parser is wrapped to note the reader's line when it closes.

var recorderKey = parser.NewContextKey()

type lineRecorder struct {
	ends map[gast.Node]int
}

type recordingParser struct {
	parser.BlockParser
}

func recorded(p parser.BlockParser) parser.BlockParser { return &recordingParser{p} }

func (p *recordingParser) Close(node gast.Node, reader text.Reader, pc parser.Context) {
	p.BlockParser.Close(node, reader, pc)
	line, _ := reader.Position()
	// At EOF the reader stays on the last line; markdown-it ends at lineMax.
	if next, _ := reader.PeekLine(); next == nil {
		line = countLines(reader.Source())
	}
	pc.Get(recorderKey).(*lineRecorder).ends[node] = line
}

// Indented code is disabled in Markdoc, so indented lines are paragraphs.
type indentedParagraphParser struct{ parser.BlockParser }

func (p *indentedParagraphParser) CanAcceptIndentedLine() bool { return true }

// converter flattens the goldmark AST into markdown-it tokens.
type converter struct {
	src        []byte
	rec        *lineRecorder
	ends       map[gast.Node]int
	lineStarts []int
	tokens     []*mdToken
	tight      [][2]int
}

func (c *converter) push(t *mdToken) *mdToken {
	c.tokens = append(c.tokens, t)
	return t
}

func (c *converter) startLine(n gast.Node) int {
	if n.Type() == gast.TypeBlock && n.Lines().Len() > 0 {
		if _, ok := n.(*gast.FencedCodeBlock); !ok {
			return c.lineOf(n.Lines().At(0).Start)
		}
	}
	return c.lineOf(n.Pos())
}

func (c *converter) blockMap(n gast.Node) []int {
	return []int{c.startLine(n), c.end(n)}
}

func (c *converter) blocks(parent gast.Node) {
	for n := parent.FirstChild(); n != nil; n = n.NextSibling() {
		c.block(n)
	}
}

func (c *converter) block(n gast.Node) {
	switch n := n.(type) {
	case *gast.Paragraph:
		m := c.blockMap(n)
		c.push(&mdToken{Type: "paragraph_open", Tag: "p", Nesting: 1, Map: m})
		c.inline(n, m)
		c.push(&mdToken{Type: "paragraph_close", Tag: "p", Nesting: -1})
	case *gast.TextBlock:
		// Tight list paragraphs; markTight hides them as markdown-it does.
		m := c.blockMap(n)
		c.push(&mdToken{Type: "paragraph_open", Tag: "p", Nesting: 1, Map: m})
		c.inline(n, m)
		c.push(&mdToken{Type: "paragraph_close", Tag: "p", Nesting: -1})
	case *gast.Heading:
		line := c.lineOf(n.Pos())
		m := []int{line, line + 1}
		tag := "h" + strconv.Itoa(n.Level)
		markup := strings.Repeat("#", n.Level)
		c.push(&mdToken{Type: "heading_open", Tag: tag, Nesting: 1, Map: m, Markup: markup})
		c.inline(n, m)
		c.push(&mdToken{Type: "heading_close", Tag: tag, Nesting: -1, Markup: markup})
	case *gast.ThematicBreak:
		line := c.lineOf(n.Pos())
		c.push(&mdToken{Type: "hr", Tag: "hr", Map: []int{line, line + 1}, Markup: c.thematicMarkup(n)})
	case *gast.FencedCodeBlock:
		c.fence(n)
	case *gast.Blockquote:
		c.push(&mdToken{Type: "blockquote_open", Tag: "blockquote", Nesting: 1, Map: c.blockMap(n), Markup: ">"})
		c.blocks(n)
		c.push(&mdToken{Type: "blockquote_close", Tag: "blockquote", Nesting: -1, Markup: ">"})
	case *gast.List:
		c.list(n)
	case *east.Table:
		c.table(n)
	case *annotationBlock:
		c.push(n.token)
	case *frontmatterBlock:
		c.push(n.token)
	default:
		// Unknown blocks are skipped; the fixture comparison will show them.
	}
}

func (c *converter) thematicMarkup(n *gast.ThematicBreak) string {
	line := c.src[c.lineStarts[c.lineOf(n.Pos())]:]
	if i := strings.IndexByte(string(line), '\n'); i >= 0 {
		line = line[:i]
	}
	var b strings.Builder
	for _, ch := range string(line) {
		if ch == '-' || ch == '*' || ch == '_' {
			b.WriteRune(ch)
		}
	}
	return b.String()
}

func (c *converter) fence(n *gast.FencedCodeBlock) {
	start := c.lineOf(n.Pos())
	pos := n.Pos()
	marker := c.src[pos]
	end := pos
	for end < len(c.src) && c.src[end] == marker {
		end++
	}
	markup := string(c.src[pos:end])

	var content strings.Builder
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		// Not seg.Value: goldmark forces a newline onto a last line at EOF.
		seg := lines.At(i)
		line := strings.Repeat(" ", seg.Padding) + string(c.src[seg.Start:seg.Stop])
		if strings.Trim(line, " \t\n") == "" {
			// markdown-it strips the fence's indentation from blank lines too.
			indent := c.fenceIndent(n)
			trimmed := strings.TrimLeft(line, " ")
			line = line[min(indent, len(line)-len(trimmed)):]
		}
		content.WriteString(line)
	}
	// markdown-it keeps the raw text after the fence markers as `info`.
	info := c.lineText(start)[end-c.lineStarts[start]:]
	c.push(&mdToken{
		Type: "fence", Tag: "code", Map: []int{start, c.end(n)},
		Content: content.String(), Markup: markup, Info: info,
	})
}

// fenceIndent is the opening fence's indentation within its container.
func (c *converter) fenceIndent(n *gast.FencedCodeBlock) int {
	b := n.Pos()
	for b > 0 && c.src[b-1] == ' ' {
		b--
	}
	return n.Pos() - b
}

func (c *converter) fenceEnd(n *gast.FencedCodeBlock, start int) int {
	end := c.recordedEnd(n)
	// goldmark closes a fence on its closing line; markdown-it's map includes
	// it. The closing line is checked without container prefixes like `> `.
	if end < len(c.lineStarts) {
		closing := c.lineText(end)
		if stripped, ok := stripContainers(closing, n.Parent()); ok {
			closing = stripped
		}
		closing = strings.TrimSpace(closing)
		if strings.HasPrefix(closing, string(c.src[n.Pos()])) && end > start {
			return end + 1
		}
	}
	return end
}

func (c *converter) lineText(line int) string {
	if line >= len(c.lineStarts) {
		return ""
	}
	s := string(c.src[c.lineStarts[line]:])
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[:i]
	}
	return s
}

func (c *converter) list(n *gast.List) {
	typ, tag, markup := "bullet_list", "ul", string(n.Marker)
	var attrs [][2]any
	if n.IsOrdered() {
		typ, tag = "ordered_list", "ol"
		if n.Start != 1 {
			attrs = [][2]any{{"start", float64(n.Start)}}
		}
	}
	open := len(c.tokens)
	c.push(&mdToken{Type: typ + "_open", Tag: tag, Nesting: 1, Map: c.blockMap(n), Markup: markup, Attrs: attrs})
	for item := n.FirstChild(); item != nil; item = item.NextSibling() {
		c.push(&mdToken{Type: "list_item_open", Tag: "li", Nesting: 1, Map: c.blockMap(item), Markup: markup})
		c.blocks(item)
		c.push(&mdToken{Type: "list_item_close", Tag: "li", Nesting: -1, Markup: markup})
	}
	c.push(&mdToken{Type: typ + "_close", Tag: tag, Nesting: -1, Markup: markup})
	if n.IsTight {
		c.tight = append(c.tight, [2]int{open, len(c.tokens) - 1})
	}
}

// markTight is markdown-it's markTightParagraphs. It hides paragraphs two
// levels below the list's closing token, so an unclosed Markdoc tag in a
// list, which shifts levels, leaves them visible.
func (c *converter) markTight() {
	levels := make([]int, len(c.tokens))
	level := 0
	for i, t := range c.tokens {
		if t.Nesting < 0 {
			level--
		}
		levels[i] = level
		if t.Nesting > 0 {
			level++
		}
	}
	for _, r := range c.tight {
		target := levels[r[1]] + 2
		for i := r[0] + 2; i < r[1]-1; i++ {
			if levels[i] == target && c.tokens[i].Type == "paragraph_open" {
				c.tokens[i].Hidden = true
				c.tokens[i+2].Hidden = true
				i += 2
			}
		}
	}
}

func (c *converter) table(n *east.Table) {
	// Tables come from transformed paragraphs, which goldmark never closes, so
	// derive the end from the header, delimiter and body rows.
	start, end := c.tableStart(n), c.end(n)
	c.push(&mdToken{Type: "table_open", Tag: "table", Nesting: 1, Map: []int{start, end}})
	line := start
	for row := n.FirstChild(); row != nil; row = row.NextSibling() {
		cell := "td"
		if _, ok := row.(*east.TableHeader); ok {
			cell = "th"
			c.push(&mdToken{Type: "thead_open", Tag: "thead", Nesting: 1, Map: []int{start, start + 1}})
		} else if row.PreviousSibling() != nil {
			if _, ok := row.PreviousSibling().(*east.TableHeader); ok {
				line = start + 2
				c.push(&mdToken{Type: "tbody_open", Tag: "tbody", Nesting: 1, Map: []int{start + 2, end}})
			}
		}
		c.push(&mdToken{Type: "tr_open", Tag: "tr", Nesting: 1, Map: []int{line, line + 1}})
		for col := row.FirstChild(); col != nil; col = col.NextSibling() {
			tc := col.(*east.TableCell)
			var attrs [][2]any
			if tc.Alignment != east.AlignNone {
				attrs = [][2]any{{"style", "text-align:" + tc.Alignment.String()}}
			}
			c.push(&mdToken{Type: cell + "_open", Tag: cell, Nesting: 1, Attrs: attrs})
			c.inline(tc, nil)
			c.push(&mdToken{Type: cell + "_close", Tag: cell, Nesting: -1})
		}
		c.push(&mdToken{Type: "tr_close", Tag: "tr", Nesting: -1})
		if _, ok := row.(*east.TableHeader); ok {
			c.push(&mdToken{Type: "thead_close", Tag: "thead", Nesting: -1})
		}
		line++
	}
	if _, ok := n.LastChild().(*east.TableHeader); !ok {
		c.push(&mdToken{Type: "tbody_close", Tag: "tbody", Nesting: -1})
	}
	c.push(&mdToken{Type: "table_close", Tag: "table", Nesting: -1})
}

// Inline content

func (c *converter) inline(n gast.Node, m []int) {
	var raw strings.Builder
	lines := n.Lines()
	for i := 0; i < lines.Len(); i++ {
		seg := lines.At(i)
		raw.Write(seg.Value(c.src))
	}
	t := &mdToken{Type: "inline", Map: m, Content: strings.TrimSpace(raw.String()), Children: []*mdToken{}}
	_, tableCell := n.(*east.TableCell)
	ic := &inlineConverter{c: c, tableCell: tableCell}
	ic.children(n)
	ic.flush()
	t.Children = ic.tokens
	c.push(t)
}

type inlineConverter struct {
	c      *converter
	tokens []*mdToken
	text   strings.Builder
	inText bool
	// tableCell is set for a table cell's content. markdown-it removes the
	// backslash of an escaped pipe while splitting a row, before inline
	// parsing, so text and even code lose it.
	tableCell bool
}

func (ic *inlineConverter) addText(s string) {
	ic.text.WriteString(s)
	ic.inText = true
}

func (ic *inlineConverter) flush() {
	if ic.inText {
		ic.tokens = append(ic.tokens, &mdToken{Type: "text", Content: ic.text.String()})
		ic.text.Reset()
		ic.inText = false
	}
}

func (ic *inlineConverter) push(t *mdToken) {
	ic.flush()
	ic.tokens = append(ic.tokens, t)
}

func (ic *inlineConverter) children(n gast.Node) {
	for k := n.FirstChild(); k != nil; k = k.NextSibling() {
		ic.node(k)
	}
}

func (ic *inlineConverter) node(n gast.Node) {
	src := ic.c.src
	switch n := n.(type) {
	case *gast.Text:
		value := string(n.Segment.Value(src))
		if ic.tableCell {
			value = strings.ReplaceAll(value, `\|`, "|")
		}
		if n.IsRaw() {
			ic.addText(value)
		} else {
			ic.addText(decodeText(value))
		}
		if n.SoftLineBreak() && !n.HardLineBreak() {
			// markdown-it's newline rule only drops one trailing space before
			// a soft break, where goldmark trims all trailing whitespace.
			tail := ic.c.src[n.Segment.Stop:]
			if i := strings.IndexByte(string(tail), '\n'); i >= 0 {
				tail = tail[:i]
			}
			t := strings.TrimSuffix(string(tail), " ")
			if strings.Trim(t, " \t") == "" {
				ic.addText(t)
			}
		}
		if n.HardLineBreak() {
			ic.push(&mdToken{Type: "hardbreak", Tag: "br"})
		} else if n.SoftLineBreak() {
			ic.push(&mdToken{Type: "softbreak", Tag: "br"})
		}
	case *gast.String:
		ic.addText(string(n.Value))
	case *codeSpan:
		content := n.content
		if ic.tableCell {
			content = strings.ReplaceAll(content, `\|`, "|")
		}
		ic.push(&mdToken{Type: "code_inline", Tag: "code", Content: content, Markup: n.markup})
	case *gast.Emphasis:
		marker := markerOf(n)
		typ, tag := "em", "em"
		if n.Level == 2 {
			typ, tag = "strong", "strong"
		}
		if marker == "~" {
			typ, tag = "s", "s"
		}
		markup := strings.Repeat(marker, n.Level)
		ic.push(&mdToken{Type: typ + "_open", Tag: tag, Nesting: 1, Markup: markup})
		ic.children(n)
		ic.push(&mdToken{Type: typ + "_close", Tag: tag, Nesting: -1, Markup: markup})
	case *gast.Link:
		attrs := [][2]any{{"href", normalizeLink(unescapeAll(string(n.Destination)))}}
		if len(n.Title) > 0 {
			attrs = append(attrs, [2]any{"title", unescapeAll(string(n.Title))})
		}
		ic.push(&mdToken{Type: "link_open", Tag: "a", Nesting: 1, Attrs: attrs})
		ic.children(n)
		ic.push(&mdToken{Type: "link_close", Tag: "a", Nesting: -1})
	case *gast.AutoLink:
		url := string(n.URL(src))
		label := string(n.Label(src))
		href := normalizeLink(url)
		if n.AutoLinkType == gast.AutoLinkEmail && !strings.HasPrefix(strings.ToLower(url), "mailto:") {
			href = normalizeLink("mailto:" + url)
		}
		if !validateLink(href) {
			// markdown-it's autolink rule fails, leaving the source as text.
			ic.addText("<" + label + ">")
			return
		}
		ic.push(&mdToken{Type: "link_open", Tag: "a", Nesting: 1, Attrs: [][2]any{{"href", href}}, Markup: "autolink", Info: "auto"})
		ic.push(&mdToken{Type: "text", Content: normalizeLinkText(label)})
		ic.push(&mdToken{Type: "link_close", Tag: "a", Nesting: -1, Markup: "autolink", Info: "auto"})
	case *gast.Image:
		attrs := [][2]any{{"src", normalizeLink(unescapeAll(string(n.Destination)))}, {"alt", ""}}
		if len(n.Title) > 0 {
			attrs = append(attrs, [2]any{"title", unescapeAll(string(n.Title))})
		}
		ic.push(&mdToken{Type: "image", Tag: "img", Attrs: attrs, Content: imageLabel(n, src), Children: []*mdToken{}})
	case *annotationInline:
		ic.push(n.token)
	default:
		ic.children(n)
	}
}

// imageLabel returns the raw source of an image's label, as markdown-it
// stores it in `content`.
func imageLabel(n *gast.Image, src []byte) string {
	start, stop := -1, -1
	var walk func(gast.Node)
	walk = func(k gast.Node) {
		for ch := k.FirstChild(); ch != nil; ch = ch.NextSibling() {
			if t, ok := ch.(*gast.Text); ok {
				if start < 0 || t.Segment.Start < start {
					start = t.Segment.Start
				}
				if t.Segment.Stop > stop {
					stop = t.Segment.Stop
				}
			}
			walk(ch)
		}
	}
	walk(n)
	if start < 0 {
		return ""
	}
	for start > 0 && src[start-1] != '[' {
		start--
	}
	// Find the label's closing bracket, as markdown-it's parseLinkLabel does.
	level := 1
	for stop = start; stop < len(src); stop++ {
		switch src[stop] {
		case '\\':
			stop++
		case '[':
			level++
		case ']':
			level--
		}
		if level == 0 {
			break
		}
	}
	return string(src[start:stop])
}

func markerOf(n gast.Node) string {
	if v, ok := n.AttributeString("marker"); ok {
		return string(v.([]byte))
	}
	return "*"
}

// delimiterParser parses emphasis or strikethrough for a single character so
// the resulting node can record its marker, which goldmark does not keep.
type delimiterParser struct {
	char byte
}

func (p *delimiterParser) Trigger() []byte { return []byte{p.char} }

// Delimiter scopes. markdown-it's StateInline.push starts a new delimiter
// list for every token with nesting 1 (including Markdoc's inline tag_open)
// and restores the previous list on nesting -1. Emphasis only pairs within a
// list, and a list that is replaced without being saved, such as the
// top-level list after a stray `{% /tag %}`, is never processed at all.

var scopeKey = parser.NewContextKey()

type delimiterScopes struct {
	current, next int
	stack         []int
	tagScopes     map[int]bool
}

func (s *delimiterScopes) alive(scope int) bool {
	return s.tagScopes[scope] || scope == s.current
}

func (s *delimiterScopes) push(nesting int) {
	switch {
	case nesting > 0:
		s.next++
		s.stack = append(s.stack, s.current)
		s.current = s.next
		s.tagScopes[s.current] = true
	case nesting < 0 && len(s.stack) > 0:
		s.current = s.stack[len(s.stack)-1]
		s.stack = s.stack[:len(s.stack)-1]
	case nesting < 0:
		// _prev_delimiters.pop() returns undefined, and Markdoc's createToken
		// replaces it with a fresh list.
		s.next++
		s.current = s.next
	}
}

func scopesFor(parent gast.Node, pc parser.Context) *delimiterScopes {
	all, _ := pc.Get(scopeKey).(map[gast.Node]*delimiterScopes)
	if all == nil {
		all = map[gast.Node]*delimiterScopes{}
		pc.Set(scopeKey, all)
	}
	s := all[parent]
	if s == nil {
		s = &delimiterScopes{tagScopes: map[int]bool{}}
		all[parent] = s
	}
	return s
}

// scopedDelimiter is a per-delimiter processor recording its scope.
type scopedDelimiter struct {
	p      *delimiterParser
	scopes *delimiterScopes
	scope  int
}

func (d *scopedDelimiter) IsDelimiter(b byte) bool { return b == d.p.char }

func (d *scopedDelimiter) CanOpenCloser(opener, closer *parser.Delimiter) bool {
	o, ok1 := opener.Processor.(*scopedDelimiter)
	c, ok2 := closer.Processor.(*scopedDelimiter)
	return ok1 && ok2 && o.p.char == c.p.char && o.scopes == c.scopes &&
		o.scope == c.scope && o.scopes.alive(o.scope)
}

func (d *scopedDelimiter) OnMatch(consumes int) gast.Node {
	n := gast.NewEmphasis(consumes)
	n.SetAttributeString("marker", []byte{d.p.char})
	return n
}

func (p *delimiterParser) Parse(parent gast.Node, block text.Reader, pc parser.Context) gast.Node {
	scopes := scopesFor(parent, pc)
	proc := &scopedDelimiter{p: p, scopes: scopes, scope: scopes.current}
	before := block.PrecendingCharacter()
	line, segment := block.PeekLine()
	node := parser.ScanDelimiter(line, before, 1, proc)
	if node == nil {
		return nil
	}
	if p.char != '~' {
		node.Segment = segment.WithStop(segment.Start + node.OriginalLength)
		block.Advance(node.OriginalLength)
		pc.PushDelimiter(node)
		return node
	}

	// markdown-it's strikethrough rule: runs shorter than two are text, an
	// odd run starts with a literal `~`, and each `~~` is its own delimiter.
	n := node.OriginalLength
	if n < 2 {
		return nil
	}
	pos := segment.Start
	if n%2 == 1 {
		parent.AppendChild(parent, gast.NewTextSegment(text.NewSegment(pos, pos+1)))
		pos++
		n--
	}
	var last *parser.Delimiter
	for i := 0; i < n; i += 2 {
		if last != nil {
			parent.AppendChild(parent, last)
		}
		d := parser.NewDelimiter(node.CanOpen, node.CanClose, 2, '~', proc)
		d.Segment = text.NewSegment(pos+i, pos+i+2)
		pc.PushDelimiter(d)
		last = d
	}
	block.Advance(node.OriginalLength)
	return last
}
