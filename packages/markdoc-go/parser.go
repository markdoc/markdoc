package markdoc

// A port of packages/markdoc/src/parser.ts and transforms/table.ts.

import (
	"strconv"
	"strings"

	"markdoc.dev/markdoc/internal/js"
)

// ParseOption configures Parse.
type ParseOption func(*parseOptions)

type parseOptions struct {
	file            string
	slots           bool
	noLocation      bool
	conditionalTags []string
}

// WithFile records file in each node's Location.
func WithFile(file string) ParseOption {
	return func(o *parseOptions) { o.file = file }
}

// WithSlots stores `slot` tags in their parent's Slots instead of its
// Children.
func WithSlots() ParseOption {
	return func(o *parseOptions) { o.slots = true }
}

// WithoutLocation leaves Lines empty and Location nil on every node.
func WithoutLocation() ParseOption {
	return func(o *parseOptions) { o.noLocation = true }
}

// WithConditionalTags sets the tags that may wrap rows in a `table` tag's
// body. Other tags between rows are dropped. The default is `if`.
func WithConditionalTags(tags ...string) ParseOption {
	return func(o *parseOptions) { o.conditionalTags = append([]string{}, tags...) }
}

var defaultTokenizer = newTokenizer()

// Parse parses Markdoc source into an AST. Syntax problems do not stop
// parsing; they are recorded in the Errors of the nodes involved.
func Parse(content string, opts ...ParseOption) *Node {
	var o parseOptions
	for _, opt := range opts {
		opt(&o)
	}
	return parseTokens(defaultTokenizer.tokenize(content), &o)
}

var mappings = map[string]string{
	"ordered_list": "list",
	"bullet_list":  "list",
	"code_inline":  "code",
	"list_item":    "item",
	"variable":     "text",
}

func annotate(node *Node, attributes []AttributeValue) {
	for _, attribute := range attributes {
		node.Annotations = append(node.Annotations, attribute)
		name, value := attribute.Name, attribute.Value
		switch attribute.Type {
		case "attribute":
			if name == "__proto__" || name == "prototype" || name == "constructor" {
				node.Errors = append(node.Errors, ValidationError{
					ID: "attribute-name-invalid", Level: LevelCritical,
					Message: "Invalid attribute name: '" + name + "'",
				})
				continue
			}
			if node.Type == "heading" && name == "level" {
				f, ok := value.(float64)
				if !ok || f != float64(int(f)) || f < 1 || f > 6 {
					node.Errors = append(node.Errors, ValidationError{
						ID: "attribute-value-invalid", Level: LevelError,
						Message: "Invalid heading level: '" + js.ToString(value) + "'",
					})
					continue
				}
			}
			if node.Attributes.Has(name) {
				node.Errors = append(node.Errors, ValidationError{
					ID: "duplicate-attribute", Level: LevelWarning,
					Message: "Attribute '" + name + "' already set",
				})
			}
			node.Attributes.Set(name, value)
		case "class":
			if cls, ok := node.Attributes.Get("class").(*OrderedMap); ok && js.Truthy(node.Attributes.Get("class")) {
				cls.Set(name, value)
			} else {
				m := NewOrderedMap()
				m.Set(name, value)
				node.Attributes.Set("class", m)
			}
		}
	}
}

func handleAttrs(token *mdToken, typ string) *OrderedMap {
	m := NewOrderedMap()
	switch typ {
	case "heading":
		level, _ := strconv.Atoi(strings.Replace(token.Tag, "h", "", 1))
		m.Set("level", float64(level))
	case "list":
		ordered := strings.HasPrefix(token.Type, "ordered")
		start, hasStart := token.attr("start")
		if ordered && hasStart && js.Truthy(start) {
			m.Set("ordered", true)
			m.Set("start", start)
			m.Set("marker", token.Markup)
		} else {
			m.Set("ordered", ordered)
			m.Set("marker", token.Markup)
		}
	case "link":
		href, _ := token.attr("href")
		m.Set("href", href)
		if title, ok := token.attr("title"); ok && js.Truthy(title) {
			m.Set("title", title)
		}
	case "image":
		src, _ := token.attr("src")
		m.Set("alt", token.Content)
		m.Set("src", src)
		if title, ok := token.attr("title"); ok && js.Truthy(title) {
			m.Set("title", title)
		}
	case "em", "strong":
		m.Set("marker", token.Markup)
	case "text", "code", "comment":
		if token.Meta != nil && token.Meta.Variable != nil {
			m.Set("content", token.Meta.Variable)
		} else {
			m.Set("content", token.Content)
		}
	case "fence":
		language, _, _ := strings.Cut(token.Info, " ")
		m.Set("content", token.Content)
		if language != "" && language != tagOpen {
			m.Set("language", language)
		}
	case "td", "th":
		if style, ok := token.attr("style"); ok {
			s, _ := style.(string)
			switch {
			case strings.Contains(s, "left"):
				m.Set("align", "left")
			case strings.Contains(s, "center"):
				m.Set("align", "center")
			case strings.Contains(s, "right"):
				m.Set("align", "right")
			}
		}
	}
	return m
}

type parseState struct {
	// lines holds each node's lines by reference: JS nodes without a map share
	// their parent's array, so a later push is visible through both.
	lines       map[*Node]*[]int
	nodes       []*Node
	file        string
	handleSlots bool
	addLocation bool
}

func (s *parseState) handleToken(token *mdToken, inlineParent *Node) {
	if token.Type == "frontmatter" {
		s.nodes[0].Attributes.Set("frontmatter", token.Content)
		return
	}
	if token.Hidden || (token.Type == "text" && token.Content == "") {
		return
	}

	errors := append([]ValidationError{}, token.Errors...)
	parent := s.nodes[len(s.nodes)-1]
	var tag string
	var attributes []AttributeValue
	var tokErr *tokenError
	if token.Meta != nil {
		tag, attributes, tokErr = token.Meta.Tag, token.Meta.Attributes, token.Meta.Error
	}

	if token.Type == "annotation" {
		if inlineParent != nil {
			annotate(inlineParent, attributes)
			return
		}
		parent.Errors = append(parent.Errors, ValidationError{
			ID: "no-inline-annotations", Level: LevelError,
			Message: "Can't apply inline annotations to '" + parent.Type + "'",
		})
		return
	}

	typeName := strings.TrimSuffix(strings.TrimSuffix(token.Type, "_open"), "_close")
	if m, ok := mappings[typeName]; ok {
		typeName = m
	}

	if typeName == "error" && tokErr != nil {
		errors = append(errors, ValidationError{
			ID: "parse-error", Level: LevelCritical, Message: tokErr.Message,
			Location: tokErr.Location, HasLocation: true,
		})
	}

	if token.Nesting < 0 {
		if parent.Type == typeName && parent.Tag == tag {
			if ref := s.lines[parent]; ref != nil && token.Map != nil {
				*ref = append(*ref, token.Map...)
			}
			s.nodes = s.nodes[:len(s.nodes)-1]
			return
		}
		errors = append(errors, ValidationError{
			ID: "missing-opening", Level: LevelCritical,
			Message: "Node '" + typeName + "' is missing opening",
		})
	}

	node := NewNode(typeName, handleAttrs(token, typeName), nil, tag)
	node.Errors = errors
	if s.addLocation {
		ref := s.lines[parent]
		if token.Map != nil {
			m := append([]int{}, token.Map...)
			ref = &m
		} else if ref == nil {
			ref = &[]int{}
		}
		s.lines[node] = ref
		node.Lines = *ref
		loc := &Location{File: s.file}
		if len(node.Lines) > 0 {
			loc.Start.Line = intp(node.Lines[0])
		}
		if len(node.Lines) > 1 {
			loc.End.Line = intp(node.Lines[1])
		}
		if token.Position != nil {
			loc.Start.Character = intp(token.Position[0])
			loc.End.Character = intp(token.Position[1])
		}
		node.Location = loc
	}

	if inlineParent != nil {
		node.Inline = true
	}

	if attributes != nil && (typeName == "tag" || typeName == "fence" || typeName == "image") {
		annotate(node, attributes)
	}

	if primary, ok := node.Attributes.Get("primary").(string); s.handleSlots && tag == "slot" && ok {
		parent.Slots.Set(primary, node)
	} else {
		parent.Push(node)
	}

	if token.Nesting > 0 {
		s.nodes = append(s.nodes, node)
	}

	if token.Children == nil {
		return
	}

	if node.Type == "inline" {
		inlineParent = parent
	}

	s.nodes = append(s.nodes, node)
	if typeName != "image" {
		for _, child := range token.Children {
			s.handleToken(child, inlineParent)
		}
	}
	s.nodes = s.nodes[:len(s.nodes)-1]
}

// ParseTokens converts a token stream into a Markdoc AST.
func parseTokens(tokens []*mdToken, args *parseOptions) *Node {
	doc := NewNode("document", nil, nil, "")
	s := &parseState{
		lines:       map[*Node]*[]int{doc: {}},
		nodes:       []*Node{doc},
		file:        args.file,
		handleSlots: args.slots,
		addLocation: !args.noLocation,
	}
	for _, token := range tokens {
		s.handleToken(token, nil)
	}
	for _, node := range s.nodes[1:] {
		name := node.Tag
		if name == "" {
			name = node.Type
		}
		node.Errors = append(node.Errors, ValidationError{
			ID: "missing-closing", Level: LevelCritical,
			Message: "Node '" + name + "' is missing closing",
		})
	}
	for node, ref := range s.lines {
		node.Lines = *ref
	}
	conditionalTags := args.conditionalTags
	if conditionalTags == nil {
		conditionalTags = []string{"if"}
	}
	tableTransform(doc, conditionalTags)
	return doc
}

// transforms/table.ts

func convertToRow(node *Node, cellType string) *Node {
	node.Type = "tr"
	node.Attributes = NewOrderedMap()
	for _, cell := range node.Children {
		cell.Type = cellType
	}
	return node
}

func isConditionalTag(node *Node, conditionalTags []string) bool {
	if node.Type != "tag" || node.Tag == "" {
		return false
	}
	for _, t := range conditionalTags {
		if t == node.Tag {
			return true
		}
	}
	return false
}

func isComment(node *Node) bool {
	return node.Type == "comment" || (node.Type == "tag" && node.Tag == "comment")
}

func unexpectedNodeError(node *Node) ValidationError {
	tag := ""
	if node.Tag != "" {
		tag = " " + node.Tag
	}
	return ValidationError{
		ID: "table-syntax", Level: LevelCritical,
		Message:  "Found " + node.Type + tag + " where a list was expected. Make sure all content inside table cells is indented.",
		Location: node.Location, HasLocation: node.Location != nil,
	}
}

func tableTransform(document *Node, conditionalTags []string) {
	document.Walk(func(node *Node) {
		if node.Type != "tag" || node.Tag != "table" || len(node.Children) == 0 {
			return
		}
		first, rest := node.Children[0], node.Children[1:]
		if first.Type == "table" {
			return
		}
		thead := NewNode("thead", nil, nil, "")
		tbody := NewNode("tbody", nil, nil, "")
		attrs := NewOrderedMap()
		for _, k := range node.Attributes.Keys() {
			attrs.Set(k, node.Attributes.Get(k))
		}
		table := NewNode("table", attrs, []*Node{thead, tbody}, "")

		if first.Type == "list" {
			thead.Push(convertToRow(first, "th"))
		}

		for _, row := range rest {
			switch {
			case row.Type == "list":
				convertToRow(row, "td")
			case isConditionalTag(row, conditionalTags):
				var children []*Node
				for _, child := range row.Children {
					if child.Type == "hr" {
						continue
					}
					if child.Type == "list" {
						convertToRow(child, "td")
					} else if !isComment(child) && child.Tag != "else" && !isConditionalTag(child, conditionalTags) {
						row.Errors = append(row.Errors, unexpectedNodeError(child))
						continue
					}
					children = append(children, child)
				}
				if children == nil {
					children = []*Node{}
				}
				row.Children = children
			case row.Type != "hr" && !isComment(row):
				node.Errors = append(node.Errors, unexpectedNodeError(row))
				continue
			default:
				continue
			}
			tbody.Push(row)
		}
		node.Children = []*Node{table}
	})
}
