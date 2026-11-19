import { describe, expect, it } from 'vitest';
import { resolve } from './base';
import FunctionNode from './function';
import Variable from './variable';

describe('resolving attribute objects', () => {
  it.each([Object.prototype, null])(
    'preserves the prototype and own data properties of %s objects',
    (prototype) => {
      const input = Object.assign(
        Object.create(prototype),
        Object.fromEntries([
          ['title', new Variable(['title'])],
          ['constructor', 'custom'],
          ['toString', 'text'],
        ]),
      );
      Object.defineProperty(input, '__proto__', {
        value: { title: new Variable(['title']) },
        enumerable: true,
      });

      const output = resolve(input, { variables: { title: 'Resolved' } });

      expect(output).not.toBe(input);
      expect(Object.getPrototypeOf(output)).toBe(prototype);
      expect(Object.keys(output)).toEqual(Object.keys(input));
      for (const [key, value] of [
        ['title', 'Resolved'],
        ['constructor', 'custom'],
        ['toString', 'text'],
        ['__proto__', { title: 'Resolved' }],
      ] as const) {
        expect(Object.getOwnPropertyDescriptor(output, key)).toEqual({
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
    },
  );

  it.each([
    {
      set() {
        throw new Error('Inherited setter must not run');
      },
    },
    { value: 'inherited', writable: false },
  ])('shadows inherited properties with descriptor %j', (descriptor) => {
    const key = '__markdocResolveTest__';
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
    Object.defineProperty(Object.prototype, key, {
      ...descriptor,
      configurable: true,
    });
    try {
      const input = Object.fromEntries([[key, new Variable(['value'])]]);
      const output = resolve(input, { variables: { value: 'resolved' } });

      expect(Object.getOwnPropertyDescriptor(output, key)).toEqual({
        value: 'resolved',
        enumerable: true,
        configurable: true,
        writable: true,
      });
      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
    } finally {
      if (previous) Object.defineProperty(Object.prototype, key, previous);
      else Reflect.deleteProperty(Object.prototype, key);
    }
  });

  it('handles inherited setters installed while resolving a value', () => {
    const key = '__markdocResolveTest__';
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, key);
    const input = Object.fromEntries([[key, new FunctionNode('install', {})]]);
    try {
      const output = resolve(input, {
        functions: {
          install: {
            transform() {
              Object.defineProperty(Object.prototype, key, {
                configurable: true,
                set() {
                  throw new Error('Inherited setter must not run');
                },
              });
              return 'resolved';
            },
          },
        },
      });
      expect(Object.getOwnPropertyDescriptor(output, key)?.value).toBe(
        'resolved',
      );
    } finally {
      if (previous) Object.defineProperty(Object.prototype, key, previous);
      else Reflect.deleteProperty(Object.prototype, key);
    }
  });

  it('snapshots attribute values before resolving functions', () => {
    const input = { first: new FunctionNode('mutate', {}), second: 'before' };
    const output = resolve(input, {
      functions: {
        mutate: {
          transform() {
            input.second = 'after';
            return 'resolved';
          },
        },
      },
    });

    expect(output).toEqual({ first: 'resolved', second: 'before' });
    expect(input.second).toBe('after');
  });
});
