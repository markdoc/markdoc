const assert = require('node:assert/strict');
const fs = require('node:fs');
const withMarkdoc = require('@markdoc/next.js');

assert.equal(typeof withMarkdoc, 'function');
assert.equal(require('@markdoc/next.js/index'), withMarkdoc);
assert.equal(typeof require('@markdoc/next.js/loader'), 'function');
const { getSchema, defaultObject } = require('@markdoc/next.js/runtime');
assert.equal(typeof getSchema, 'function');
assert.deepEqual(defaultObject({ default: { value: 1 } }), { value: 1 });
const tags = require('@markdoc/next.js/tags');
for (const name of ['head', 'image', 'link', 'script']) {
  assert.equal(tags[name].render, require(`next/${name}`));
}
let called = false;
const config = withMarkdoc({ mode: 'server' })({
  webpack(config) {
    called = true;
    return config;
  },
});
const webpack = { module: { rules: [] } };
const babel = { options: { pagesDir: '/app/pages' } };
assert.equal(
  config.webpack(webpack, {
    defaultLoaders: { babel },
    dir: '/app',
  }),
  webpack
);
assert.equal(called, true);
const [{ use }] = webpack.module.rules;
assert.equal(use[0], babel);
assert.equal(use[1].options.mode, 'server');
assert.equal(use[1].options.dir, '/app');
assert(fs.existsSync(use[1].loader));
assert.equal(require(use[1].loader), require('@markdoc/next.js/loader'));
const turbopack = withMarkdoc()({ turbopack: {} }).turbopack;
assert.equal(turbopack.rules['*.md'].as, '*.js');
assert(fs.existsSync(turbopack.rules['*.md'].loaders[0].loader));
