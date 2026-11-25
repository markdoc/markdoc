import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Configuration } from 'webpack';

// TypeScript emits this configuration alongside the compiled application.
const root = fileURLToPath(new URL('..', import.meta.url));

export default {
  entry: path.join(root, '.build/src/index.js'),
  output: {
    filename: 'main.js',
    path: path.join(root, 'dist')
  }
} satisfies Configuration;
