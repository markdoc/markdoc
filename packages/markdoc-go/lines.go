package markdoc

// markdown-it's line maps. goldmark keeps no line ranges for containers, so
// ends are recomputed the way markdown-it's block rules set `state.line`.

import (
	"strings"

	gast "github.com/yuin/goldmark/ast"
	east "github.com/yuin/goldmark/extension/ast"
)

func (c *converter) lineMax() int { return countLines(c.src) }

// isEmpty reports whether a line is blank. Lines inside the blockquote
// quote are checked after removing container prefixes, as markdown-it
// adjusts their offsets.
func (c *converter) isEmpty(line int, quote gast.Node) bool {
	if line >= c.lineMax() {
		return false
	}
	s := c.lineText(line)
	if quote != nil && line < c.recordedEnd(quote) {
		if line == c.lineOf(quote.Pos()) {
			s = string(c.src[quote.Pos()+1 : c.lineStarts[line]+len(s)])
		} else if stripped, ok := stripContainers(s, quote); ok {
			s = stripped
		}
	}
	return strings.Trim(s, " \t") == ""
}

func (c *converter) skipEmptyLines(line int, quote gast.Node) int {
	for ; line < c.lineMax(); line++ {
		if !c.isEmpty(line, quote) {
			break
		}
	}
	return line
}

// afterTokenize returns `state.line` after markdown-it's block tokenize loop
// stops: last is the end of the last block, endLine the container's limit.
func (c *converter) afterTokenize(last, endLine int, quote gast.Node) int {
	line := last
	if line < endLine && c.isEmpty(line, quote) {
		line++
	}
	if line < endLine {
		line = c.skipEmptyLines(line, quote)
	}
	return line
}

// startTokenize returns `state.line` when markdown-it tokenizes a container
// with no blocks: the loop skips empty lines before checking its limit.
func (c *converter) startTokenize(start, endLine int, quote gast.Node) int {
	if start < endLine {
		return c.skipEmptyLines(start, quote)
	}
	return start
}

// lastEnd is the end of a container's last block.
func (c *converter) lastEnd(n gast.Node) (int, bool) {
	if n.LastChild() == nil {
		return 0, false
	}
	return c.end(n.LastChild()), true
}

// containerEnd is the `endLine` markdown-it passes when tokenizing n's
// children, and quote the innermost enclosing blockquote.
func (c *converter) containerEnd(n gast.Node) (endLine int, quote gast.Node) {
	for p := n; p != nil; p = p.Parent() {
		if _, ok := p.(*gast.Blockquote); ok {
			return c.recordedEnd(p), p
		}
	}
	return c.lineMax(), nil
}

func (c *converter) recordedEnd(n gast.Node) int {
	if end, ok := c.rec.ends[n]; ok {
		return end
	}
	return c.lineMax()
}

func (c *converter) end(n gast.Node) int {
	if e, ok := c.ends[n]; ok {
		return e
	}
	e := c.computeEnd(n)
	c.ends[n] = e
	return e
}

func (c *converter) computeEnd(n gast.Node) int {
	switch n := n.(type) {
	case *gast.Paragraph, *gast.TextBlock, *gast.LinkReferenceDefinition:
		lines := n.Lines()
		return c.lineOf(lines.At(lines.Len()-1).Start) + 1
	case *gast.Heading, *gast.ThematicBreak:
		return c.lineOf(n.Pos()) + 1
	case *gast.FencedCodeBlock:
		return c.fenceEnd(n, c.lineOf(n.Pos()))
	case *annotationBlock:
		return n.token.Map[1]
	case *frontmatterBlock:
		return n.token.Map[1] + 1
	case *east.Table:
		return c.tableStart(n) + 1 + n.ChildCount()
	case *gast.Blockquote:
		next := c.recordedEnd(n)
		if last, ok := c.lastEnd(n); ok {
			return c.afterTokenize(last, next, n)
		}
		return c.startTokenize(c.startLine(n), next, n)
	case *gast.List:
		return c.end(n.LastChild())
	case *gast.ListItem:
		endLine, quoted := c.containerEnd(n.Parent())
		start := c.lineOf(n.Pos())
		if last, ok := c.lastEnd(n); ok {
			return c.afterTokenize(last, endLine, quoted)
		}
		// An item with nothing on its first line takes one blank line at most.
		if c.isEmpty(start+1, quoted) {
			return min(start+2, endLine)
		}
		return c.startTokenize(start+1, endLine, quoted)
	}
	return c.recordedEnd(n)
}

// tableStart is the header row's line. goldmark keeps the position of the
// paragraph a table was split from, which may start earlier.
func (c *converter) tableStart(n *east.Table) int {
	var found = -1
	var walk func(gast.Node)
	walk = func(k gast.Node) {
		for ch := k.FirstChild(); ch != nil && found < 0; ch = ch.NextSibling() {
			if t, ok := ch.(*gast.Text); ok {
				found = c.lineOf(t.Segment.Start)
				return
			}
			walk(ch)
		}
	}
	if h := n.FirstChild(); h != nil {
		walk(h)
	}
	if found < 0 {
		return c.lineOf(n.Pos())
	}
	return found
}
