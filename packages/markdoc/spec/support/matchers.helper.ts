import { deepEquals } from 'deep-assert';
import { expect } from 'vitest';

function deepEqualsWrapper(actual, expected, options = {}) {
  try {
    deepEquals(actual, expected, options);
    return { pass: true, message: () => 'Unexpected match' };
  } catch (err) {
    return { pass: false, message: () => err.message };
  }
}

expect.extend({
  toDeepEqualSubset(actual, expected) {
    return deepEqualsWrapper(actual, expected, {
      allowAdditionalProps: true,
    });
  },

  toDeepEqual(actual, expected) {
    return deepEqualsWrapper(actual, expected);
  },
});
