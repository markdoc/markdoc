# Markdoc docs

[Markdoc](https://markdoc.dev) is a [Markdown](https://commonmark.org)-based syntax and toolchain for creating custom documentation sites and experiences.
We designed Markdoc to power [Stripe's public docs](http://stripe.com/docs), our largest and most complex content site.

## Contributing

The site is maintained in `apps/docs` in the [Markdoc repository](https://github.com/markdoc/markdoc).
See the [contributing guide](../../.github/CONTRIBUTING.md).

## Installation

Run these commands from the repository root, using the Node version in `.node-version`:

1. Install dependencies with `pnpm install`.
2. Start the development server with `pnpm dev --filter=@markdoc/docs`.
3. Open [http://localhost:3000](http://localhost:3000) and edit `apps/docs/pages/index.md`.

Turborepo builds Markdoc before starting the app, which uses both local Markdoc
packages. If you change a library, rebuild it with
`pnpm build --filter='./packages/*'`. The examples in `examples/` are standalone reference
projects and are not workspace packages.

Run `pnpm build --filter=@markdoc/docs` for a production build and sitemap
generation, or `pnpm lint --filter=@markdoc/docs` for the site's lint checks.
Next.js output and generated sitemaps are cached by the app's `turbo.json`.
To regenerate the language specification, run `pnpm exec turbo run spec --filter=@markdoc/docs`.

## Environment

Put local environment settings in `apps/docs/.env.local`:

- `NEXT_PUBLIC_ALGOLIA_APP_ID` and `NEXT_PUBLIC_ALGOLIA_API_KEY` configure the
  public DocSearch client for the `markdoc` search index.
- `NEXT_PUBLIC_FONTS_BASE_URL` points to the hosted font directory; the default
  is `/fonts`. The font files are not included in this repository.

Turborepo infers `NEXT_PUBLIC_*` inputs from Next.js, and the app configuration
also includes `.env*` files in its build hash.

## Deployment

This is a private application, deployed independently of npm package releases.
Docs-only changes do not need a changeset.

For the existing Vercel project, connect `markdoc/markdoc`, set the Root Directory
to `apps/docs`, and enable access to source files outside that directory. Keep
the project's existing domain and environment settings. The app's `vercel.json`
runs the filtered Turbo build from the workspace root so local libraries build
first; Next.js tracing includes the workspace root.

## Code of conduct

This project has adopted the Stripe [Code of conduct](https://github.com/markdoc/markdoc/blob/main/.github/CODE_OF_CONDUCT.md).

## License

This project uses the [MIT license](LICENSE).
