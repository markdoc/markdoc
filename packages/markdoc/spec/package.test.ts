import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

describe('Built package', () => {
  it.each(['index.js', 'index.mjs'])(
    'executes reactStatic output from %s',
    (entry) => {
      // Load each build in Node so Vitest cannot transform the bundled helpers.
      execFileSync(
        process.execPath,
        [
          fileURLToPath(new URL('./package/react-static.mjs', import.meta.url)),
          entry,
        ],
        { stdio: 'pipe' },
      );
    },
  );
});
