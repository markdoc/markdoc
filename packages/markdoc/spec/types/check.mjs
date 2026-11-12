import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import yaml from 'yaml-js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const fixtures = fileURLToPath(new URL('./', import.meta.url));
// Keep consumers outside the repository so its dev dependencies cannot hide
// missing dependencies in the published declaration graph.
const consumer = mkdtempSync(join(tmpdir(), 'markdoc-types-'));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const { packageManager } = JSON.parse(
  readFileSync(join(workspace, 'package.json'))
);
const { minimumReleaseAge } = yaml.load(
  readFileSync(join(workspace, 'pnpm-workspace.yaml'), 'utf8')
);

function check(name, files, options) {
  const program = ts.createProgram(files, {
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2021,
    types: [],
    // Keep coverage of the legacy Node resolver while TypeScript 6 deprecates it.
    ignoreDeprecations: '6.0',
    ...options,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(
      `${name} failed:\n${ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => consumer,
        getNewLine: () => '\n',
      })}`
    );
  }
  console.log(`Published types: ${name} passed`);
}

try {
  check(
    'markdown-it option compatibility',
    [join(fixtures, 'tokenizer-options.ts')],
    {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    }
  );
  const packed = join(consumer, 'markdoc.tgz');
  execFileSync(pnpm, ['pack', '--out', packed], { cwd: root });
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, packageManager })
  );
  writeFileSync(
    join(consumer, '.npmrc'),
    `minimum-release-age=${minimumReleaseAge}\n`
  );
  execFileSync(pnpm, ['add', '--ignore-scripts', '--no-lockfile', packed], {
    cwd: consumer,
    stdio: 'inherit',
  });
  const consumerRequire = createRequire(join(consumer, 'package.json'));
  const markdocRequire = createRequire(
    consumerRequire.resolve('@markdoc/markdoc')
  );
  assert.throws(
    () => markdocRequire.resolve('react'),
    { code: 'MODULE_NOT_FOUND' },
    'The React runtime should remain optional'
  );
  assert.throws(
    () => markdocRequire.resolve('markdown-it'),
    { code: 'MODULE_NOT_FOUND' },
    'The public declarations should not require the bundled parser'
  );

  const cases = [
    ['node', ts.ModuleKind.CommonJS, ts.ModuleResolutionKind.Node10, 'cts'],
    [
      'NodeNext CJS',
      ts.ModuleKind.NodeNext,
      ts.ModuleResolutionKind.NodeNext,
      'cts',
    ],
    [
      'NodeNext ESM',
      ts.ModuleKind.NodeNext,
      ts.ModuleResolutionKind.NodeNext,
      'mts',
    ],
    ['bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler, 'mts'],
  ];

  for (const fixture of ['consumer', 'react']) {
    // Check Markdoc's declaration graph before adding dependencies used directly
    // by the React example. pnpm keeps automatically installed peers isolated.
    if (fixture === 'react') {
      execFileSync(
        pnpm,
        [
          'add',
          '--save-dev',
          '--ignore-scripts',
          '--no-lockfile',
          '@types/react',
        ],
        { cwd: consumer, stdio: 'inherit' }
      );
    }
    for (const [name, module, moduleResolution, extension] of cases) {
      const destination = join(consumer, `${fixture}.${extension}`);
      copyFileSync(join(fixtures, `${fixture}.ts`), destination);
      check(`${name} ${fixture}`, [destination], { module, moduleResolution });
    }
  }
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
