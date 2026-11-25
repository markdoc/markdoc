import 'codemirror';

// CodeMirror 5 APIs used by the custom mode but missing from its published types.
declare module 'codemirror' {
  interface StringStream {
    hideFirstChars<T>(count: number, inner: () => T): T;
  }
  interface Mode<T> {
    electricInput?: RegExp;
  }
  function copyState<T>(mode: Mode<T>, state: T): T;
  function defineMode<T>(name: string, factory: ModeFactory<T>, ...dependencies: string[]): void;
}
