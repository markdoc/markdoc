# HTML example

This example uses [Express.js](https://expressjs.com/) and [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) to render Markdoc.

We use [Lit](https://lit.dev/docs/) to simplify organizing and creating our Web Components but you can use native Web Component browser features directly to build your own set of custom elements.

## Setup

To get started:

1. Download the project.
2. Use the Node.js version in `.node-version` and the pnpm version pinned in `package.json`.
3. Run `pnpm install --frozen-lockfile` and `pnpm build` from this directory to build the components.
4. Run `pnpm start` to start the server.
5. View the sample Markdoc page at `http://localhost:4242`.

This example has its own pnpm workspace and lockfile, so it can run in place or
be copied into a separate repository. New dependency resolutions use the
repository's 31-day minimum release age.
