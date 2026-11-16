const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdoc-nextjs-runtime-'));
try {
  const appDir = path.join(dir, 'app');
  const pagesDir = path.join(dir, 'pages');
  fs.mkdirSync(appDir);
  fs.mkdirSync(pagesDir);

  let called = false;
  const config = withMarkdoc({ mode: 'server' })({
    webpack(config) {
      called = true;
      return config;
    },
  });
  const webpack = { module: { rules: [] } };
  const babel = { options: {} };
  assert.equal(
    config.webpack(webpack, { defaultLoaders: { babel }, dir }),
    webpack
  );
  assert.equal(called, true);
  const [
    {
      oneOf: [appRule, fallbackRule],
    },
  ] = webpack.module.rules;
  assert.equal(appRule.include, `${appDir}${path.sep}`);
  assert.equal(appRule.use.length, 1);
  assert.equal(fallbackRule.use[0], babel);
  const loader = fallbackRule.use[1];
  assert.equal(appRule.use[0], loader);
  assert.deepEqual(loader.options, { dir, appDir, pagesDir, mode: 'server' });
  assert(fs.existsSync(loader.loader));
  assert.equal(require(loader.loader), require('@markdoc/next.js/loader'));

  const turbopack = withMarkdoc({ dir })({ turbopack: {} }).turbopack;
  assert.equal(turbopack.rules['*.md'].as, '*.js');
  const turboLoader = turbopack.rules['*.md'].loaders[0];
  assert(fs.existsSync(turboLoader.loader));
  assert.deepEqual(turboLoader.options, { dir, appDir, pagesDir });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
