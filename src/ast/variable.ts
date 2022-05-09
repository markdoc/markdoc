import type { Config, AstType } from '../types';

export default class Variable implements AstType {
  readonly $$mdtype = 'Variable';

  path;

  constructor(path: (string | number)[] = []) {
    this.path = path;
  }

  resolve({ variables }: Config = {}) {
    return variables instanceof Function
      ? variables(this.path)
      : this.path.reduce((obj = {}, key) => obj[key], variables);
  }
}
