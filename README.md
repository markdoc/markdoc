<h1 align="center">
  <br>
    <img src="https://user-images.githubusercontent.com/62121649/167893184-a2b69260-ca9e-4a77-a5bc-63b8135ae5db.png" alt="Markdoc" width="260">
  <br>
  <br>
</h1>

<h4 align="center">A powerful, flexible, Markdown-based authoring framework.</h4>

Markdoc is a [Markdown](https://commonmark.org)-based syntax and toolchain for creating custom documentation sites and experiences.  
We designed Markdoc to power [Stripe's public docs](http://stripe.com/docs), our largest and most complex content site.

## Installation

To get started with Markdoc, first install the library:

```shell
pnpm add @markdoc/markdoc
```

and import it in your app:

```js
const Markdoc = require('@markdoc/markdoc');
```

or if you are using ESM

```js
import Markdoc from '@markdoc/markdoc';
```

then use `Markdoc` in your app or tool:

```js
const doc = `
# Markdoc README

{% image src="/logo.svg" /%}
`;

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast);
return Markdoc.renderers.react(content, React);
```

Check out [our docs](https://markdoc.dev/docs) for more guidance on how to use Markdoc.

### Rendering Markdown

`Markdoc.renderers.md` renders the same transformed content as Markdown
(CommonMark with GFM tables and strikethrough), for example to serve docs to
LLMs or other plain-text consumers:

```js
const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast, config);
const markdown = Markdoc.renderers.md(content);
```

The renderer takes the output of `Markdoc.transform`, so variables, conditionals,
and partials are already resolved. A string passed to the renderer is treated as
literal text, not as Markdoc source. Information removed during transformation,
such as frontmatter, annotations, and the original whitespace or Markdown
markers, is not reconstructed. The output is Markdown, not markup-free text:
literal text is escaped so that it keeps its meaning.

Standard Markdoc nodes render without configuration. Other elements, including
custom components, render their children. To convert a component differently,
add a handler keyed by its rendered name (`Tag.name`, such as `Callout`, rather
than the source tag name `callout`). Handlers return Markdown AST nodes built
with `Markdoc.Ast.Node`; `'children'` renders only the children and `'none'`
omits the whole subtree:

```js
const markdown = Markdoc.renderers.md(content, {
  handlers: {
    Callout: (tag, { renderChildren }) =>
      new Markdoc.Ast.Node('blockquote', {}, renderChildren(tag.children)),
    Layout: 'children',
    CopyButton: 'none',
  },
});
```

Handlers may override standard elements, such as `table` or `pre`, and may not
return Markdoc tags or unresolved variables.

Tables render as compact GFM pipe tables with a single header row. Headerless
tables get an empty header, and ragged rows are padded. Cell spans, nested
tables, and block content inside cells (such as paragraphs, lists, and code
blocks) cannot be represented, so their text is kept in row order on a single
line; use a `table` handler for richer output.

The Markdown renderer does not sanitize HTML or validate URLs: link and image
destinations are kept as supplied, including relative URLs.

### Agent skills

The [Markdoc agent plugin](https://github.com/markdoc/markdoc/tree/main/plugins/markdoc)
provides `setup-markdoc`, `write-markdoc`, and `create-markdoc-tag` skills for
Codex and Claude Code. Install them through [skills.sh](https://skills.sh/docs/cli):

```sh
pnpm dlx skills add https://markdoc.dev
```

See the plugin README for marketplace installation and local testing.

### TypeScript

The public renderer types require `@types/react`, even when using only the
Markdown parser or HTML renderer. Package managers that install peer dependencies
automatically will install it; otherwise, install `@types/react` explicitly.
The React runtime is optional.

For TypeScript projects that use a bundler, use:

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "esnext", // works with es2015 or greater
    "esModuleInterop": true
  }
}
```

For code run directly by Node.js, use `"module": "nodenext"` and
`"moduleResolution": "nodenext"` instead.

### React

If you are using React, install Markdoc with:

```sh
pnpm add @markdoc/markdoc react @types/react
```

## Contributing

Contributions and feedback are welcome and encouraged. Check out our [contributing guidelines](.github/CONTRIBUTING.md) on how to do so.

### Development

For development, use the Node version in `.node-version` and
[pnpm](https://pnpm.io/installation), with the version pinned in `package.json`.
If using Corepack, run `corepack enable` first.

This repository uses pnpm workspaces and Turborepo:

- `packages/markdoc` contains the published `@markdoc/markdoc` library, its tests, and build configuration.
- `packages/next.js` contains the published `@markdoc/next.js` integration and its tests.
- `apps/docs` contains the private documentation site deployed at [markdoc.dev](https://markdoc.dev).
- `packages/*` is the home for additional packages.
- `apps/*` is the home for applications.

Run these commands from the repository root:

1. Run `pnpm install`
1. Run `pnpm run build`
1. Run `pnpm lint` to check formatting, imports, and lint rules
1. Run the tests using `pnpm test`
1. Check the built package's TypeScript declarations using `pnpm run test:types`

Add release notes with `pnpm changeset`. See the [Changesets guide](.changeset/README.md)
for versioning and the release process.

Run `pnpm run check` for the workspace checks. Turborepo builds workspace dependencies
first and caches build outputs in each package's `dist` directory.

To work on Markdoc alone, use `pnpm --filter @markdoc/markdoc test` or
`pnpm exec turbo run build --filter=@markdoc/markdoc`.

New packages and apps should declare their own scripts and use `workspace:*`
for dependencies on other workspaces. Applications should set `"private": true`.
Packages with build outputs other than `dist` should configure those outputs
in a package-level `turbo.json`.

The Next.js integration compiles its TypeScript source to JavaScript and type
declarations in `dist`. Run `pnpm exec turbo run test test:types --filter=@markdoc/next.js`
to build both packages and check the integration's runtime and published types.

Run `pnpm dev --filter=@markdoc/docs` to develop the documentation site using the
local packages. See the [app README](apps/docs/README.md) for environment and
deployment setup.

The projects in `apps/docs/examples/` have independent pnpm workspaces and
lockfiles. From an example's directory, run `pnpm install --frozen-lockfile`,
then follow its README to start the app. CI builds each example separately.

## Code of conduct

This project has adopted the Stripe [Code of conduct](.github/CODE_OF_CONDUCT.md).

## License

This project uses the [MIT license](LICENSE).

## Credits

Special shout out to:

- [@marcioAlmada](https://github.com/marcioAlmada) for providing us with the [@markdoc](https://github.com/markdoc) GitHub org.
- [@koomen](https://github.com/koomen) for gifting us https://markdoc.dev.
