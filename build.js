#!/usr/bin/env node
const { buildSync } = require('esbuild');

const shared = {
  bundle: true,
  entryPoints: ['index.ts'],
  outdir: 'dist',
  sourcemap: 'external',
  external: [],
  format: 'esm',
};

// Target node for the CommonJS build so esbuild emits the export-name
// annotation that lets Node's ESM loader see the named exports
// (`import { Node } from '@markdoc/markdoc'`). Keep the module
// resolution of the default browser platform so the same dependency
// builds get bundled.
buildSync({
  ...shared,
  format: 'cjs',
  platform: 'node',
  mainFields: ['browser', 'module', 'main'],
  conditions: ['browser'],
});
buildSync({ ...shared, outExtension: { '.js': '.mjs' } });
buildSync({ ...shared, entryPoints: ['src/renderers/react/react.ts'] });
