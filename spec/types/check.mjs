import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = fileURLToPath(new URL('./', import.meta.url));
// Keep consumers outside the repository so its dev dependencies cannot hide
// missing dependencies in the published declaration graph.
const consumer = mkdtempSync(join(tmpdir(), 'markdoc-types-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function check(name, files, options) {
  const program = ts.createProgram(files, {
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    esModuleInterop: true,
    target: ts.ScriptTarget.ES2021,
    types: [],
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
  const [packed] = JSON.parse(
    execFileSync(npm, ['pack', '--json', '--pack-destination', consumer], {
      cwd: root,
      encoding: 'utf8',
    })
  );
  writeFileSync(join(consumer, 'package.json'), '{"private":true}\n');
  execFileSync(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      join(consumer, packed.filename),
    ],
    { cwd: consumer, stdio: 'inherit' }
  );
  assert.equal(
    existsSync(join(consumer, 'node_modules/react')),
    false,
    'The React runtime should remain optional'
  );
  assert.equal(
    existsSync(join(consumer, 'node_modules/markdown-it')),
    false,
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

  for (const [name, module, moduleResolution, extension] of cases) {
    const files = ['consumer', 'react'].map((fixture) => {
      const destination = join(consumer, `${fixture}.${extension}`);
      copyFileSync(join(fixtures, `${fixture}.ts`), destination);
      return destination;
    });
    check(`${name} consumer`, files, { module, moduleResolution });
  }
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
