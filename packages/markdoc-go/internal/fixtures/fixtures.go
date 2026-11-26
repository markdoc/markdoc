// Package fixtures loads the golden fixtures that scripts/gen-fixtures.mjs
// records from @markdoc/markdoc.
package fixtures

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// A Fixture records what @markdoc/markdoc produces for an input.
type Fixture struct {
	Name  string `json:"name"`
	Input string `json:"input"`
	JSON  string `json:"json"`
	// Config is config data, which configdata_test.go in package markdoc turns
	// into a Config;
	// Slots and File are parser options.
	Config json.RawMessage `json:"config"`
	Slots  bool            `json:"slots"`
	File   string          `json:"file"`
	// FormatOptions are the options for Format, as JSON.
	FormatOptions json.RawMessage `json:"formatOptions"`
	// Each output is a string, or {"error": message} where JS threw. MD is
	// absent where @markdoc/markdoc has no Markdown renderer.
	Transform json.RawMessage `json:"transform"`
	HTML      json.RawMessage `json:"html"`
	Validate  json.RawMessage `json:"validate"`
	Format    json.RawMessage `json:"format"`
	MD        json.RawMessage `json:"md"`
}

// Expected decodes a recorded output. ok is false if JS threw or the output
// wasn't recorded.
func Expected(raw json.RawMessage) (s string, ok bool) {
	if len(raw) == 0 || json.Unmarshal(raw, &s) != nil {
		return "", false
	}
	return s, true
}

// A Suite is the fixtures from one file.
type Suite struct {
	Name     string
	Fixtures []Fixture
}

// Load reads every suite in testdata/fixtures.
func Load() ([]Suite, error) {
	_, file, _, _ := runtime.Caller(0)
	dir := filepath.Join(filepath.Dir(file), "../../testdata/fixtures")
	files, err := filepath.Glob(filepath.Join(dir, "*.json"))
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, os.ErrNotExist
	}
	var suites []Suite
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return nil, err
		}
		s := Suite{Name: strings.TrimSuffix(filepath.Base(file), ".json")}
		if err := json.Unmarshal(data, &s.Fixtures); err != nil {
			return nil, err
		}
		suites = append(suites, s)
	}
	return suites, nil
}
