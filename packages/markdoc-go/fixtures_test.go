package markdoc

import (
	"encoding/json"
	"fmt"
	"testing"

	"markdoc.dev/markdoc/internal/fixtures"
)

func fixtureParseOptions(f fixtures.Fixture) []ParseOption {
	var opts []ParseOption
	if f.Slots {
		opts = append(opts, WithSlots())
	}
	if f.File != "" {
		opts = append(opts, WithFile(f.File))
	}
	return opts
}

// stringDiff describes where two strings first differ.
func stringDiff(want, got string) string {
	i := 0
	for i < len(want) && i < len(got) && want[i] == got[i] {
		i++
	}
	from := max(i-40, 0)
	return fmt.Sprintf("at byte %d\n  want: %q\n  got:  %q", i, want[from:min(i+80, len(want))], got[from:min(i+80, len(got))])
}

// check compares got with the output JS recorded in raw, if any.
func check(t *testing.T, what string, raw json.RawMessage, got string, err error) {
	t.Helper()
	if want, ok := fixtures.Expected(raw); ok {
		compare(t, what, want, got, err)
	}
}

func compare(t *testing.T, what, want, got string, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("%s: %v", what, err)
	} else if got != want {
		t.Errorf("%s differs from JS %s", what, stringDiff(want, got))
	}
}

func testFixture(t *testing.T, f fixtures.Fixture) {
	opts := fixtureParseOptions(f)
	b, err := marshalJS(Parse(f.Input, opts...))
	compare(t, "AST", f.JSON, string(b), err)
	if revived, err := FromJSON([]byte(f.JSON)); err != nil {
		t.Errorf("FromJSON: %v", err)
	} else {
		b, err := marshalJS(revived)
		compare(t, "FromJSON round trip", f.JSON, string(b), err)
	}

	config, err := configFromData(f.Config)
	if err != nil {
		t.Fatalf("config: %v", err)
	}
	tree, err := Transform(Parse(f.Input, opts...), config)
	b, _ = marshalJS(tree)
	check(t, "transform", f.Transform, string(b), err)
	b, err = marshalJS(Validate(Parse(f.Input, opts...), config))
	check(t, "validate", f.Validate, string(b), err)

	var formatOptions *FormatOptions
	if len(f.FormatOptions) > 0 {
		if err := json.Unmarshal(f.FormatOptions, &formatOptions); err != nil {
			t.Fatalf("format options: %v", err)
		}
	}
	check(t, "format", f.Format, Format(Parse(f.Input, opts...), formatOptions), nil)
}

// TestFixtures compares the AST and the transform, validate and format
// outputs with JS. Each renderer package checks its own output.
func TestFixtures(t *testing.T) {
	suites, err := fixtures.Load()
	if err != nil {
		t.Fatalf("loading fixtures: %v; run node scripts/gen-fixtures.mjs", err)
	}
	for _, s := range suites {
		t.Run(s.Name, func(t *testing.T) {
			for _, f := range s.Fixtures {
				t.Run(f.Name, func(t *testing.T) { testFixture(t, f) })
			}
		})
	}
}
