import type {
  AstType,
  Config,
  Function as AstFunction,
  Scalar,
} from '../types';

export function isAst(value?: any): value is AstType {
  return !!value?.$$mdtype;
}

export function isFunction(value?: any): value is AstFunction {
  return !!(value?.$$mdtype === 'Function');
}

export function* getAstValues(value: any): Generator<AstType, void, unknown> {
  if (value == null || typeof value !== 'object') return;

  if (Array.isArray(value)) for (const v of value) yield* getAstValues(v);

  if (isAst(value)) yield value;

  if (Object.getPrototypeOf(value) !== Object.prototype) return;

  for (const v of Object.values(value)) yield* getAstValues(v);
}

export function resolve(value: any, config: Config = {}): any {
  if (value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => resolve(item, config));

  if (isAst(value) && value?.resolve instanceof Function)
    return value.resolve(config);

  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  const output: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(value)) output[k] = resolve(v, config);
  return output;
}
