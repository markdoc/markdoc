import 'vitest';

declare module 'vitest' {
  interface Assertion {
    toDeepEqual(expected: unknown): void;
    toDeepEqualSubset(expected: unknown): void;
  }
}
