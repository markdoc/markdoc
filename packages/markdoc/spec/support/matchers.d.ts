declare namespace jasmine {
  interface Matchers<T> {
    toDeepEqual(expected: any, expectationFailureOutput?: T): boolean;
    toDeepEqualSubset(expected: any, expectationFailureOutput?: T): boolean;
  }
}
