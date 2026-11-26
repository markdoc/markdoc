// Generates golden fixtures from the workspace build of @markdoc/markdoc
// into testdata/fixtures, which is gitignored; `pnpm test` runs this first.
//
//   pnpm --filter @markdoc/markdoc build && node scripts/gen-fixtures.mjs
//
// Each fixture records the input, its parser and config options, and what
// JS produces for it: the AST as JSON and the transform, HTML, validate and
// format outputs.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from './configs.mjs';
import { outputs } from './outputs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const markdocDir = join(root, '../markdoc');
const require = createRequire(join(markdocDir, 'package.json'));
const Markdoc = require(join(markdocDir, 'dist/index.js'));
const yaml = require('yaml-js');

// options are the fixture's config data, its `slots` and `file` parser
// options and its format options, all of which are recorded for the Go test
// to use.
function fixture(name, input, options = {}) {
  const { config, slots, file, formatOptions } = options;
  const parserArgs = { slots, file };
  return {
    name,
    input,
    ...(config && { config }),
    ...(slots && { slots }),
    ...(file && { file }),
    ...(formatOptions && { formatOptions }),
    json: JSON.stringify(Markdoc.parse(input, parserArgs)),
    ...outputs(
      Markdoc,
      input,
      buildConfig(Markdoc, config),
      parserArgs,
      formatOptions,
    ),
  };
}

const inputs = join(root, 'testdata/inputs');
const suites = {
  marktest: yaml
    .load(readFileSync(join(markdocDir, 'spec/marktest/tests.yaml'), 'utf8'))
    .map((t) => fixture(t.name, t.code, t)),
  config: yaml
    .load(readFileSync(join(inputs, 'config.yaml'), 'utf8'))
    .map((t) => fixture(t.name, t.code, t)),
  format: JSON.parse(readFileSync(join(inputs, 'format.json'), 'utf8')).map(
    ({ source, options }, i) =>
      fixture(`formatter.test.ts ${i}`, source, { formatOptions: options }),
  ),
  compat: readdirSync(join(inputs, 'compat'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => fixture(f, readFileSync(join(inputs, 'compat', f), 'utf8'))),
};

const out = join(root, 'testdata/fixtures');
mkdirSync(out, { recursive: true });
for (const [suite, fixtures] of Object.entries(suites)) {
  writeFileSync(join(out, `${suite}.json`), JSON.stringify(fixtures));
}
