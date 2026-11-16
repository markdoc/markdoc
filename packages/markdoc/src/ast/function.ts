import type { AstType, Config } from '../types';
import { resolve } from './base';

export default class Function implements AstType {
  readonly $$mdtype = 'Function';

  name;
  parameters;

  constructor(name: string, parameters: Record<string, any>) {
    this.name = name;
    this.parameters = parameters;
  }

  resolve(config: Config = {}) {
    const fn = config?.functions?.[this.name];
    if (!fn) return null;

    const parameters = resolve(this.parameters, config);
    return fn.transform?.(parameters, config);
  }
}
