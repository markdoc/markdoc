import type {
  Function as AstFunction,
  AstType,
  Variable as AstVariable,
  Config,
  Scalar,
} from '../types';
import FunctionNode from './function';
import VariableNode from './variable';

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

  if (isFunction(value))
    return new FunctionNode(value.name, value.parameters).resolve(config);

  if (isVariable(value)) return new VariableNode(value.path).resolve(config);

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  const output: Record<string, Scalar> = Object.create(prototype);
  for (const [k, v] of Object.entries(value)) {
    const resolved = resolve(v, config);
    // Define inherited keys explicitly to bypass setters and read-only properties.
    if (prototype === null || !(k in output)) output[k] = resolved;
    else
      Object.defineProperty(output, k, {
        value: resolved,
        enumerable: true,
        configurable: true,
        writable: true,
      });
  }
  return output;
}
