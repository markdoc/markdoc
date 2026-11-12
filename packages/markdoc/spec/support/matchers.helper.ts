import { deepEquals } from 'deep-assert';

function deepEqualsWrapper(actual, expected, options = {}) {
  try {
    deepEquals(actual, expected, options);
    return { pass: true, message: 'Unexpected match' };
  } catch (err) {
    return { pass: false, message: err.message };
  }
}

const matchers = {
  toDeepEqualSubset() {
    return {
      compare(actual, expected) {
        return deepEqualsWrapper(actual, expected, {
          allowAdditionalProps: true,
        });
      },
    };
  },

  toDeepEqual() {
    return {
      compare(actual, expected) {
        return deepEqualsWrapper(actual, expected);
      },
    };
  },
};

beforeEach(() => {
  jasmine.addMatchers(matchers);
});
