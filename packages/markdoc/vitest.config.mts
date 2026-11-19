import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'spec/**/*.test.ts'],
    setupFiles: ['./spec/support/matchers.helper.ts'],
  },
});
