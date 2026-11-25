# React example

This example builds a client-side rendered React app that fetches Markdoc ASTs from an [Express.js](https://expressjs.com/) server.  
This project was built with `create-react-app`.

## Setup

Use the Node.js version in `.node-version` and the pnpm version pinned in
`package.json`. From this directory, run:

```bash
pnpm install --frozen-lockfile
pnpm start
```

Open `http://localhost:3000/`. The Express server runs on port 4242.
Run `pnpm build` to compile the server and create the production client bundle.

This example has its own pnpm workspace and lockfile, so it can run in place or
be copied into a separate repository. New dependency resolutions use the
repository's 31-day minimum release age.

The client and server use TypeScript. `pnpm type:check` checks both projects.
`pnpm start:server` compiles the backend into `.server/` before starting it;
Create React App compiles the client during development and production builds.
This legacy example uses TypeScript 4.9, which `react-scripts` 5 supports.
