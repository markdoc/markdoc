import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';

export default defineConfig([
  ...next,
  globalIgnores(['components/codemirror/**']),
  {
    rules: {
      'import/no-anonymous-default-export': 'off'
    }
  }
]);
