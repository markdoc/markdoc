import type {
  AstType,
  Config,
  Function as AstFunction,
  Scalar,
  Variable as AstVariable,
} from '../types';

export function isAst(value?: any): value is AstType {
  return !!value?.$$mdtype;
}

export function isFunction(value?: any): value is AstFunction {
  return !!(value?.$$mdtype === 'Function');
}

export function isVariable(value?: any): value is AstVariable {
  return !!(value?.$$mdtype === 'Variable');
}

export function* getAstValues(value: any): Generator<AstType, void, unknown> {
  if (value == null || typeof value !== 'object') return;

  if (Array.isArray(value)) for (const v of value) yield* getAstValues(v);

  if (isAst(value)) yield value;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return;

  for (const v of Object.values(value)) yield* getAstValues(v);
}

export function resolve(value: any, config: Config = {}): any {
  if (value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => resolve(item, config));

  if (isAst(value) && value?.resolve instanceof Function)
    return value.resolve(config);

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  const output: Record<string, Scalar> = Object.create(prototype);
  for (const [k, v] of Object.entries(value))
    Object.defineProperty(output, k, {
      value: resolve(v, config),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  return output;
}
