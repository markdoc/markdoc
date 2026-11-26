// Serves the go-import metadata that makes markdoc.dev/markdoc the import
// path of the Go module in packages/markdoc-go, for the module and each of
// its packages. Browsers are sent on to the package documentation.
const GO_IMPORT =
  'markdoc.dev/markdoc git https://github.com/markdoc/markdoc packages/markdoc-go';
const DOCS = 'https://pkg.go.dev/markdoc.dev/markdoc';

export function GET() {
  return new Response(
    `<!doctype html>
<meta name="go-import" content="${GO_IMPORT}">
<meta http-equiv="refresh" content="0; url=${DOCS}">
<a href="${DOCS}">${DOCS}</a>
`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
