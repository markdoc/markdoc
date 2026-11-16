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
3. Open [http://localhost:3000](http://localhost:3000) and edit `apps/docs/app/page.md`.

Turborepo builds Markdoc before starting the app, which uses both local Markdoc
packages. If you change a library, rebuild it with
`pnpm build --filter='./packages/*'`. The examples in `examples/` are standalone reference
projects and are not workspace packages.

Run `pnpm build --filter=@markdoc/docs` for a production build and sitemap
generation, or `pnpm lint --filter=@markdoc/docs` for the site's lint checks.
Next.js output is cached by the app's `turbo.json`.
To regenerate the language specification, run `pnpm exec turbo run spec --filter=@markdoc/docs`.
Run `pnpm test --filter=@markdoc/docs` to build the site and check every route,
metadata, redirects, and crawler endpoints against a production server.

## Routing and content

The app uses Next.js 16's App Router and Turbopack. Each document is a native
`page.md` file: `app/docs/faq/page.md` serves `/docs/faq`. To add a page, add a
`page.md` in its route folder. Ordinary Markdown files can be colocated in `app/`
and imported as components without becoming routes. The sitemap discovers the
site's static `page.md` routes.

Use top-level `title` and `description` in frontmatter for Next.js metadata:

```md
---
title: Frequently asked questions
description: Answers to common questions about Markdoc.
---

# {% $markdoc.frontmatter.title %}
```

For additional metadata or overrides, use `nextjs.metadata`; its fields take
precedence over the top-level defaults. The root layout supplies the title
template, canonical URLs, and shared social metadata. Next.js inherits those
defaults and combines them with each page's metadata. The homepage sets its full
title because the title template applies only to child route segments.

`app/layout.js` owns global styles, fonts, and the shared shell. The interactive
components use client boundaries, with a Styled JSX registry for server-rendered
styles and a browser-only CodeMirror editor. `app/sitemap.js` and `app/robots.js`
generate the crawler metadata during the production build.

If this checkout previously built the Pages Router app, remove its generated
`public/sitemap*.xml` and `public/robots.txt` files once so they do not shadow
the new metadata routes.

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
