# React + Node Markdoc Example

This example includes two applications:

- A client app created with [Vite](https://vite.dev/)'s `react` template
- A basic Node backend that provides a simple API

Use the Node.js version in `.node-version` and the pnpm version pinned in
`package.json`. From this directory, run:

```bash
pnpm install --frozen-lockfile
pnpm start
```

View the client app at `http://localhost:5173/`. The Express server runs on port 4242.

This example has its own pnpm workspace and lockfile, so it can run in place or
be copied into a separate repository. New dependency resolutions use the
repository's 31-day minimum release age.

To build the production version, run `pnpm build` to bundle the static files
into `static/`, then start the Node server with `pnpm start:server` and open
`http://localhost:4242/`. Express serves the built `static/index.html` and assets.
