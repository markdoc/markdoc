package markdoc

// Ports of the markdown-it helpers Markdoc's tokens depend on: unescapeAll,
// entity decoding, normalizeLink, normalizeLinkText and validateLink.
// Punycode hostname recoding is not implemented in this spike.

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/yuin/goldmark/util"
)

var unescapeAllRe = regexp.MustCompile(`(?i)\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_` + "`" + `{|}~])|&([a-z#][a-z0-9]{1,31});`)
var digitalEntityTestRe = regexp.MustCompile(`(?i)^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$`)

// unescapeAll mirrors markdown-it's utils.unescapeAll.
func unescapeAll(s string) string {
	if !strings.ContainsAny(s, "\\&") {
		return s
	}
	return unescapeAllRe.ReplaceAllStringFunc(s, func(m string) string {
		if m[0] == '\\' {
			return m[1:]
		}
		return replaceEntityPattern(m, m[1:len(m)-1])
	})
}

func replaceEntityPattern(match, name string) string {
	if name[0] == '#' && digitalEntityTestRe.MatchString(name) {
		var code uint64
		if name[1] == 'x' || name[1] == 'X' {
			code, _ = strconv.ParseUint(name[2:], 16, 32)
		} else {
			code, _ = strconv.ParseUint(name[1:], 10, 32)
		}
		if isValidEntityCode(code) {
			return string(rune(code))
		}
		return match
	}
	if e, ok := util.LookUpHTML5EntityByName(name); ok {
		return string(e.Characters)
	}
	return match
}

func isValidEntityCode(c uint64) bool {
	switch {
	case c >= 0xD800 && c <= 0xDFFF, c >= 0xFDD0 && c <= 0xFDEF,
		c&0xFFFF == 0xFFFF || c&0xFFFF == 0xFFFE,
		c <= 0x08, c == 0x0B, c >= 0x0E && c <= 0x1F,
		c >= 0x7F && c <= 0x9F, c > 0x10FFFF:
		return false
	}
	return true
}

var textEntityRe = regexp.MustCompile(`(?i)\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_` + "`" + `{|}~])|&(?:#(x[0-9a-f]{1,6}|[0-9]{1,7})|([a-z][a-z0-9]{1,31}));`)

// decodeText applies markdown-it's `escape` and `entity` inline rules to text.
func decodeText(s string) string {
	if !strings.ContainsAny(s, "\\&") {
		return s
	}
	return textEntityRe.ReplaceAllStringFunc(s, func(m string) string {
		if m[0] == '\\' {
			return m[1:]
		}
		if m[1] == '#' {
			var code uint64
			if m[2] == 'x' || m[2] == 'X' {
				code, _ = strconv.ParseUint(m[3:len(m)-1], 16, 32)
			} else {
				code, _ = strconv.ParseUint(m[2:len(m)-1], 10, 32)
			}
			if isValidEntityCode(code) {
				return string(rune(code))
			}
			return "\uFFFD"
		}
		if e, ok := util.LookUpHTML5EntityByName(m[1 : len(m)-1]); ok {
			return string(e.Characters)
		}
		return m
	})
}

var badProtoRe = regexp.MustCompile(`^(vbscript|javascript|file|data):`)
var goodDataRe = regexp.MustCompile(`^data:image/(gif|png|jpeg|webp);`)

// validateLink mirrors markdown-it's validateLink, which rejects
// javascript:, vbscript:, file: and most data: URLs.
func validateLink(url string) bool {
	s := strings.ToLower(strings.TrimSpace(url))
	if badProtoRe.MatchString(s) {
		return goodDataRe.MatchString(s)
	}
	return true
}

func normalizeLink(url string) string {
	return mdurlEncode(url, ";/?:@&=+$,-_.!~*'()#")
}

func normalizeLinkText(url string) string {
	return mdurlDecode(url, ";/?:@&=+$,#")
}

func isHex(b byte) bool {
	return b >= '0' && b <= '9' || b >= 'a' && b <= 'f' || b >= 'A' && b <= 'F'
}

func mdurlEncode(s, exclude string) string {
	var b strings.Builder
	for i := 0; i < len(s); {
		c := s[i]
		if c == '%' && i+2 < len(s) && isHex(s[i+1]) && isHex(s[i+2]) {
			b.WriteString(s[i : i+3])
			i += 3
			continue
		}
		if c < 0x80 {
			if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.IndexByte(exclude, c) >= 0 {
				b.WriteByte(c)
			} else {
				fmt.Fprintf(&b, "%%%02X", c)
			}
			i++
			continue
		}
		r, size := utf8.DecodeRuneInString(s[i:])
		for _, x := range []byte(string(r)) {
			fmt.Fprintf(&b, "%%%02X", x)
		}
		i += size
	}
	return b.String()
}

func mdurlDecode(s, exclude string) string {
	var b strings.Builder
	for i := 0; i < len(s); {
		if s[i] != '%' {
			b.WriteByte(s[i])
			i++
			continue
		}
		// Collect a run of %XX bytes and decode valid UTF-8 sequences.
		j := i
		var bytes []byte
		for j+2 < len(s) && s[j] == '%' && isHex(s[j+1]) && isHex(s[j+2]) {
			v, _ := strconv.ParseUint(s[j+1:j+3], 16, 8)
			bytes = append(bytes, byte(v))
			j += 3
		}
		if len(bytes) == 0 {
			b.WriteByte('%')
			i++
			continue
		}
		k := 0
		for k < len(bytes) {
			if bytes[k] < 0x80 {
				if strings.IndexByte(exclude, bytes[k]) >= 0 {
					b.WriteString(s[i+k*3 : i+k*3+3])
				} else {
					b.WriteByte(bytes[k])
				}
				k++
				continue
			}
			r, size := utf8.DecodeRune(bytes[k:])
			if r == utf8.RuneError && size <= 1 {
				b.WriteString("�")
				k++
				continue
			}
			b.WriteRune(r)
			k += size
		}
		i = j
	}
	return b.String()
}
