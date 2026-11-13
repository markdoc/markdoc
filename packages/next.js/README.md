# `@markdoc/next.js`

> **Note**: this plugin will be treated as a beta version until `v1.0.0` is released.

Using the `@markdoc/next.js` plugin allows you to create custom `.md` and `.mdoc` pages in your Next.js apps, and automatically render them with [`markdoc`](https://github.com/markdoc/markdoc).

## Setup

The first thing you'll need to do is install `@markdoc/next.js` and add it to your project's config.

1. From your project, run this command to install `@markdoc/next.js`:
   ```sh
   npm install @markdoc/next.js @markdoc/markdoc
   ```
2. Open `next.config.js` and add the following code:

   When using Webpack:

   ```js
   // next.config.js

   const withMarkdoc = require('@markdoc/next.js');

   module.exports = withMarkdoc(/* options */)({
     pageExtensions: ['js', 'md'],
   });
   ```

   For [Turbopack support](https://nextjs.org/docs/app/api-reference/turbopack), add the following configuration:

   ```js
   // next.config.js
   module.exports = withMarkdoc({
     dir: process.cwd(), // Required for Turbopack file resolution
     schemaPath: './markdoc', // Wherever your Markdoc schema lives
   })({
     pageExtensions: ['js', 'md'],
     turbopack: {}, // Turbopack only runs the loader when a base config exists
   });
   ```

   Turbopack currently requires every schema entry file referenced by `schemaPath` to exist,
   even if you are not customizing them yet. Create `config.js`, `nodes.js`, `tags.js`, and
   `functions.js` in that directory (exporting empty objects is fine) so the loader can resolve
   them during the build.

3. Create a new Markdoc file in `pages/docs` named `getting-started.md`.

   ```
   pages
   ├── _app.js
   ├── docs
   │   └── getting-started.md
   ├── index.js
   ```

4. Add some content to `getting-started.md`:

   ```md
   ---
   title: Get started with Markdoc
   description: How to get started with Markdoc
   ---

   # Get started with Markdoc
   ```

See [our docs](https://markdoc.dev/docs/nextjs) for more options.

## Contributing

Contributions and feedback are welcomed and encouraged. Feel free to open PRs here, or open issues in the [Markdoc core repo](https://github.com/markdoc/markdoc).

Follow these steps to set up the project:

1. Run `npm install`
1. Run `npm test`

## Code of conduct

This project has adopted the Stripe [Code of conduct](https://github.com/markdoc/markdoc/blob/main/.github/CODE_OF_CONDUCT.md).

## License

This project uses the [MIT license](LICENSE).
