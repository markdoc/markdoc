package js

import (
	"math"
	"testing"
)

// Number.prototype.toString

func TestFormatNumber(t *testing.T) {
	// Untyped constants are exact, so add at run time as JS does.
	tenth, fifth := 0.1, 0.2
	cases := map[float64]string{
		0: "0", math.Copysign(0, -1): "0", 1: "1", -1.5: "-1.5", 100: "100", 0.1: "0.1",
		tenth + fifth: "0.30000000000000004", 1e21: "1e+21", 1.5e21: "1.5e+21", 1e20: "100000000000000000000",
		123456789012345680000: "123456789012345680000", 1e-6: "0.000001", 1e-7: "1e-7", 1.5e-7: "1.5e-7",
		-1e-7: "-1e-7", 5e-324: "5e-324", math.MaxFloat64: "1.7976931348623157e+308",
		math.Inf(1): "Infinity", math.Inf(-1): "-Infinity",
	}
	for f, want := range cases {
		if got := FormatNumber(f); got != want {
			t.Errorf("FormatNumber(%v) = %q, want %q", f, got, want)
		}
	}
	if got := FormatNumber(math.NaN()); got != "NaN" {
		t.Errorf("FormatNumber(NaN) = %q", got)
	}
}
