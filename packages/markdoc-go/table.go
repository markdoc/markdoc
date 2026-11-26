package markdoc

// A goldmark block parser porting markdown-it's `table` rule, which runs
// before every other block rule, ends at the first line another block rule
// would take, and accepts any other non-empty line as a row.

import (
	"strings"

	gast "github.com/yuin/goldmark/ast"
	east "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
	"markdoc.dev/markdoc/internal/js"
)

var tableStateKey = parser.NewContextKey()

type tableState struct {
	delimiterDone bool
	aligns        []east.Alignment
}

type tableParser struct{}

// Trigger returns every byte, so the parser runs first on any line.
func (p *tableParser) Trigger() []byte {
	b := make([]byte, 0, 255)
	for i := 1; i < 256; i++ {
		if i != '\n' {
			b = append(b, byte(i))
		}
	}
	return b
}

func tableStates(pc parser.Context) map[gast.Node]*tableState {
	m, _ := pc.Get(tableStateKey).(map[gast.Node]*tableState)
	if m == nil {
		m = map[gast.Node]*tableState{}
		pc.Set(tableStateKey, m)
	}
	return m
}

func (p *tableParser) Open(parent gast.Node, reader text.Reader, pc parser.Context) (gast.Node, parser.State) {
	if pc.BlockOffset() < 0 || pc.BlockIndent() >= 4 {
		return nil, parser.NoChildren
	}
	// A lazy continuation line cannot start a table: markdown-it checks the
	// delimiter row against the container's indentation.
	if last := pc.LastOpenedBlock().Node; gast.IsParagraph(last) && last.Parent() != parent {
		return nil, parser.NoChildren
	}
	src := reader.Source()
	line, seg := reader.PeekLine()
	header := strings.TrimRight(string(line), "\n")
	delim, ok := nextContainerLine(src, seg.Start, parent)
	if !ok {
		return nil, parser.NoChildren
	}
	aligns, ok := markdownItTable(header, delim)
	if !ok {
		return nil, parser.NoChildren
	}
	table := east.NewTable()
	table.Alignments = aligns
	row := east.NewTableRow(aligns)
	for i, cell := range tableCells(header, seg.Start, len(aligns)) {
		row.AppendChild(row, newCell(cell, aligns[i]))
	}
	table.AppendChild(table, east.NewTableHeader(row))
	tableStates(pc)[table] = &tableState{aligns: aligns}
	return table, parser.NoChildren
}

func (p *tableParser) Continue(node gast.Node, reader text.Reader, pc parser.Context) parser.State {
	st := tableStates(pc)[node]
	if !st.delimiterDone {
		st.delimiterDone = true
		return parser.Continue | parser.NoChildren
	}
	line, seg := reader.PeekLine()
	if line == nil {
		return parser.Close
	}
	w, pos := util.IndentWidth(line, reader.LineOffset())
	rest := strings.TrimRight(string(line[pos:]), "\n")
	if strings.TrimSpace(rest) == "" || w >= 4 || terminatesTable(string(reader.Source()), seg.Start+pos, rest) {
		return parser.Close
	}
	row := east.NewTableRow(st.aligns)
	for i, cell := range tableCells(strings.TrimRight(string(line), "\n"), seg.Start, len(st.aligns)) {
		row.AppendChild(row, newCell(cell, st.aligns[i]))
	}
	node.AppendChild(node, row)
	return parser.Continue | parser.NoChildren
}

func (p *tableParser) Close(gast.Node, text.Reader, parser.Context) {}
func (p *tableParser) CanInterruptParagraph() bool                  { return true }
func (p *tableParser) CanAcceptIndentedLine() bool                  { return false }

func newCell(seg *text.Segment, align east.Alignment) *east.TableCell {
	cell := east.NewTableCell()
	cell.Alignment = align
	if seg != nil {
		cell.Lines().Append(*seg)
	}
	return cell
}

// tableCells splits a row as markdown-it's escapedSplit does, dropping empty
// edge cells and padding or truncating to the column count. Escaped pipes
// keep their backslash, which the inline escape rule then removes.
func tableCells(line string, base, count int) []*text.Segment {
	start, end := 0, len(line)
	for start < end && js.IsWhitespace(rune(line[start])) {
		start++
	}
	for end > start && js.IsWhitespace(rune(line[end-1])) {
		end--
	}
	type span struct{ a, b int }
	var spans []span
	last, escaped := start, false
	for pos := start; pos < end; pos++ {
		if line[pos] == '|' && !escaped {
			spans = append(spans, span{last, pos})
			last = pos + 1
		}
		escaped = line[pos] == '\\'
	}
	spans = append(spans, span{last, end})
	if len(spans) > 0 && spans[0].a == spans[0].b {
		spans = spans[1:]
	}
	if len(spans) > 0 && spans[len(spans)-1].a == spans[len(spans)-1].b {
		spans = spans[:len(spans)-1]
	}
	cells := make([]*text.Segment, count)
	for i := 0; i < count && i < len(spans); i++ {
		a, b := spans[i].a, spans[i].b
		for a < b && js.IsWhitespace(rune(line[a])) {
			a++
		}
		for b > a && js.IsWhitespace(rune(line[b-1])) {
			b--
		}
		if a < b {
			s := text.NewSegment(base+a, base+b)
			cells[i] = &s
		}
	}
	return cells
}

// markdownItTable applies markdown-it's checks to a header and delimiter
// row, returning the column alignments.
func markdownItTable(header, delim string) ([]east.Alignment, bool) {
	d := strings.TrimLeft(delim, " \t")
	if indentWidth(delim[:len(delim)-len(d)]) >= 4 {
		return nil, false
	}
	isSpace := func(b byte) bool { return b == ' ' || b == '\t' }
	if len(d) < 2 || !strings.ContainsRune("|-:", rune(d[0])) {
		return nil, false
	}
	if !strings.ContainsRune("|-:", rune(d[1])) && !isSpace(d[1]) || d[0] == '-' && isSpace(d[1]) {
		return nil, false
	}
	for i := 2; i < len(d); i++ {
		if !strings.ContainsRune("|-:", rune(d[i])) && !isSpace(d[i]) {
			return nil, false
		}
	}
	columns := strings.Split(js.Trim(d), "|")
	var aligns []east.Alignment
	for i, c := range columns {
		c = js.Trim(c)
		if c == "" {
			if i == 0 || i == len(columns)-1 {
				continue
			}
			return nil, false
		}
		if !alignRe.MatchString(c) {
			return nil, false
		}
		switch {
		case c[0] == ':' && c[len(c)-1] == ':':
			aligns = append(aligns, east.AlignCenter)
		case c[0] == ':':
			aligns = append(aligns, east.AlignLeft)
		case c[len(c)-1] == ':':
			aligns = append(aligns, east.AlignRight)
		default:
			aligns = append(aligns, east.AlignNone)
		}
	}
	h := js.Trim(header)
	if !strings.Contains(h, "|") {
		return nil, false
	}
	cells := escapedSplit(h)
	if len(cells) > 0 && cells[0] == "" {
		cells = cells[1:]
	}
	if len(cells) > 0 && cells[len(cells)-1] == "" {
		cells = cells[:len(cells)-1]
	}
	if len(cells) == 0 || len(cells) != len(aligns) {
		return nil, false
	}
	return aligns, true
}

// nextContainerLine returns the line after the one at offset, with its
// container prefixes removed.
func nextContainerLine(src []byte, offset int, parent gast.Node) (string, bool) {
	i := strings.IndexByte(string(src[offset:]), '\n')
	if i < 0 {
		return "", false
	}
	next := string(src[offset+i+1:])
	if j := strings.IndexByte(next, '\n'); j >= 0 {
		next = next[:j]
	}
	return stripContainers(next, parent)
}

// stripContainers removes the markers of enclosing blockquotes and the
// indentation of enclosing list items from a raw line, approximating
// markdown-it's per-line block offsets.
func stripContainers(next string, parent gast.Node) (string, bool) {
	var containers []gast.Node
	for n := parent; n != nil; n = n.Parent() {
		containers = append([]gast.Node{n}, containers...)
	}
	for _, n := range containers {
		switch n := n.(type) {
		case *gast.Blockquote:
			t := strings.TrimLeft(next, " ")
			if len(next)-len(t) > 3 || !strings.HasPrefix(t, ">") {
				return "", false
			}
			next = strings.TrimPrefix(t[1:], " ")
		case *gast.ListItem:
			t := strings.TrimLeft(next, " ")
			if len(next)-len(t) < n.Offset && t != "" {
				return "", false
			}
			next = next[min(n.Offset, len(next)-len(t)):]
		}
	}
	return next, true
}

// terminatesTable reports whether a block rule with markdown-it's
// `blockquote` alt would start at this line, ending the table.
func terminatesTable(src string, start int, line string) bool {
	switch {
	case strings.HasPrefix(line, ">"):
		return true
	case strings.HasPrefix(line, "```"):
		i := strings.IndexFunc(line, func(r rune) bool { return r != '`' })
		return i < 0 || !strings.Contains(line[i:], "`")
	case strings.HasPrefix(line, "~~~"):
		return true
	case strings.HasPrefix(line, "{%"):
		_, ok := blockTagEnd(src, start)
		return ok
	}
	if isThematicBreak(line) || isListMarker(line) {
		return true
	}
	h := strings.TrimLeft(line, "#")
	if n := len(line) - len(h); n >= 1 && n <= 6 && (h == "" || h[0] == ' ' || h[0] == '\t') {
		return true
	}
	return false
}

func isThematicBreak(line string) bool {
	if line == "" || !strings.ContainsRune("*-_", rune(line[0])) {
		return false
	}
	count := 0
	for i := 0; i < len(line); i++ {
		switch line[i] {
		case line[0]:
			count++
		case ' ', '\t':
		default:
			return false
		}
	}
	return count >= 3
}

func isListMarker(line string) bool {
	after := func(rest string) bool { return rest == "" || rest[0] == ' ' || rest[0] == '\t' }
	if line != "" && strings.ContainsRune("*+-", rune(line[0])) {
		return after(line[1:])
	}
	i := 0
	for i < len(line) && i < 10 && line[i] >= '0' && line[i] <= '9' {
		i++
	}
	if i == 0 || i > 9 || i >= len(line) || (line[i] != '.' && line[i] != ')') {
		return false
	}
	return after(line[i+1:])
}
