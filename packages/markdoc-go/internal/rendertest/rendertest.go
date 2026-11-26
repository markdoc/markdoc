// Package rendertest checks a renderer against the outputs recorded in the
// fixtures, rendering the tree that JS's transform produced for each.
package rendertest

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"

	"markdoc.dev/markdoc"
	"markdoc.dev/markdoc/internal/fixtures"
)

// Run runs a subtest for each fixture with an output recorded by output,
// comparing it with what render writes for the fixture's tree.
func Run(t *testing.T, output func(fixtures.Fixture) json.RawMessage, render func(w io.Writer, tree any) error) {
	suites, err := fixtures.Load()
	if err != nil {
		t.Fatalf("loading fixtures: %v; run node scripts/gen-fixtures.mjs", err)
	}
	for _, s := range suites {
		t.Run(s.Name, func(t *testing.T) {
			for _, f := range s.Fixtures {
				want, ok := fixtures.Expected(output(f))
				if !ok {
					continue
				}
				src, ok := fixtures.Expected(f.Transform)
				if !ok {
					continue
				}
				t.Run(f.Name, func(t *testing.T) {
					tree, err := Tree(src)
					if err != nil {
						t.Fatalf("decoding the transform output: %v", err)
					}
					var b strings.Builder
					if err := render(&b, tree); err != nil {
						t.Fatal(err)
					}
					if got := b.String(); got != want {
						t.Errorf("differs from JS\n  input: %q\n  want:  %q\n  got:   %q", f.Input, want, got)
					}
				})
			}
		})
	}
}

// Tree decodes a renderable tree encoded by JSON.stringify, reviving its
// tags. Objects become *markdoc.OrderedMap values and numbers float64.
func Tree(src string) (any, error) {
	d := json.NewDecoder(strings.NewReader(src))
	v, err := decode(d)
	if err != nil {
		return nil, err
	}
	if _, err := d.Token(); err != io.EOF {
		return nil, errors.New("trailing data")
	}
	return v, nil
}

func decode(d *json.Decoder) (any, error) {
	tok, err := d.Token()
	if err != nil {
		return nil, err
	}
	switch tok {
	case json.Delim('['):
		items := []any{}
		for d.More() {
			v, err := decode(d)
			if err != nil {
				return nil, err
			}
			items = append(items, v)
		}
		_, err := d.Token()
		return items, err
	case json.Delim('{'):
		m := markdoc.NewOrderedMap()
		for d.More() {
			k, err := d.Token()
			if err != nil {
				return nil, err
			}
			v, err := decode(d)
			if err != nil {
				return nil, err
			}
			m.Set(k.(string), v)
		}
		if _, err := d.Token(); err != nil {
			return nil, err
		}
		if m.Get("$$mdtype") != "Tag" {
			return m, nil
		}
		name, _ := m.Get("name").(string)
		attributes, _ := m.Get("attributes").(*markdoc.OrderedMap)
		children, _ := m.Get("children").([]any)
		return markdoc.NewTag(name, attributes, children), nil
	}
	if _, ok := tok.(json.Delim); ok {
		return nil, fmt.Errorf("unexpected %v", tok)
	}
	return tok, nil
}
