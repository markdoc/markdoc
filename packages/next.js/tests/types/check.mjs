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
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const fixtures = fileURLToPath(new URL('./', import.meta.url));
const require = createRequire(import.meta.url);
const { packageManager } = JSON.parse(
  readFileSync(join(workspace, 'package.json'))
);
const { minimumReleaseAge } = yaml.load(
  readFileSync(join(workspace, 'pnpm-workspace.yaml'), 'utf8')
);
const pnpm = process.env.npm_execpath;
assert(pnpm, 'Run this check with pnpm run test:types');

function runPnpm(args, cwd) {
  return execFileSync(process.execPath, [pnpm, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function check(cwd, name, files, options) {
  const program = ts.createProgram(
    files.map((file) => join(cwd, file)),
    {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
      types: ['node'],
      typeRoots: [join(cwd, 'node_modules', '@types')],
      ignoreDeprecations: '6.0',
      ...options,
    }
  );
  // Next's own declaration graph has upstream diagnostics (e.g. its bundled
  // Satori declarations). Still check our emitted declarations and consumers.
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        !diagnostic.file?.fileName
          .replaceAll('\\', '/')
          .includes('/node_modules/next/')
    );
  assert.equal(
    diagnostics.length,
    0,
    `${name}:\n${ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => cwd,
      getNewLine: () => '\n',
    })}`
  );
  console.log(`Published package: ${name} passed`);
}

const consumer = mkdtempSync(join(tmpdir(), 'markdoc-nextjs-types-'));
try {
  const coreTarball = join(consumer, 'markdoc.tgz');
  const nextTarball = join(consumer, 'nextjs.tgz');
  runPnpm(['pack', '--out', coreTarball], join(root, '..', 'markdoc'));
  const packed = JSON.parse(
    runPnpm(['pack', '--out', nextTarball, '--json'], root)
  );
  for (const name of ['index', 'loader', 'runtime', 'tags', 'types']) {
    assert(packed.files.some((file) => file.path === `dist/${name}.js`));
    assert(packed.files.some((file) => file.path === `dist/${name}.d.ts`));
  }
  assert(
    packed.files.every(
      (file) => !file.path.startsWith('src/') && !file.path.startsWith('tests/')
    )
  );
  writeFileSync(
    join(consumer, '.npmrc'),
    `minimum-release-age=${minimumReleaseAge}\n`
  );
  for (const [next, react, typesMajor] of [
    ['14.2.35', '18.2.0', '18'],
    [
      require('next/package.json').version,
      require('react/package.json').version,
      '19',
    ],
  ]) {
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({ private: true, packageManager })
    );
    runPnpm(
      [
        'add',
        '--ignore-scripts',
        '--no-lockfile',
        coreTarball,
        nextTarball,
        `next@${next}`,
        `react@${react}`,
        `react-dom@${react}`,
        `@types/react@${typesMajor}`,
        `@types/react-dom@${typesMajor}`,
        '@types/node@24',
      ],
      consumer
    );
    for (const [name, module, moduleResolution, extension] of [
      [
        'Node CJS',
        ts.ModuleKind.CommonJS,
        ts.ModuleResolutionKind.Node10,
        'cts',
      ],
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
      ['Bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler, 'mts'],
    ]) {
      const file = `consumer.${extension}`;
      copyFileSync(join(fixtures, 'consumer.ts'), join(consumer, file));
      const files = [file];
      if (extension === 'cts') {
        copyFileSync(
          join(fixtures, 'require.cts'),
          join(consumer, 'require.cts')
        );
        files.push('require.cts');
      }
      check(consumer, `Next ${next} ${name}`, files, {
        module,
        moduleResolution,
      });
    }
    for (const file of ['runtime.cjs', 'runtime.mjs']) {
      copyFileSync(join(fixtures, file), join(consumer, file));
      execFileSync(process.execPath, [join(consumer, file)], {
        cwd: consumer,
        stdio: 'inherit',
      });
    }
    console.log(`Published package: Next ${next} CJS/ESM runtime passed`);
  }
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
