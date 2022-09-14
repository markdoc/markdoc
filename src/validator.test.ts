import Markdoc, { nodes } from '../index';
import type { ValidationError } from './types';

function validate(string, config) {
  return Markdoc.validate(Markdoc.parse(string), config);
}

describe('validate', function () {
  describe('function validation', function () {
    it('ensures that function exists', function () {
      const example = '{% foo bar=baz() /%}';
      const output = validate(example, {
        validation: { validateFunctions: true },
        tags: {
          foo: {
            attributes: {
              bar: { type: String },
            },
          },
        },
      });

      expect(output).toDeepEqualSubset([
        {
          error: {
            id: 'function-undefined',
            message: "Undefined function: 'baz'",
          },
        },
      ]);
    });

    describe('return type checking', function () {
      const example = '{% foo bar=baz() /%}';
      const schema = {
        validation: { validateFunctions: true },
        functions: {
          baz: {
            returns: String,
          },
          number: {
            returns: Number,
          },
          nested: {
            returns: String,
            parameters: {
              0: { type: String },
              1: { type: Number },
            },
          },
          withUnion: {
            returns: [String, Number],
            parameters: {},
          },
        },
        tags: {
          foo: {
            attributes: {
              bar: { type: String },
            },
          },
          'union-tag-1': {
            attributes: {
              foo: { type: String },
              bar: { type: Number },
              baz: { type: Boolean },
            },
          },
        },
      };

      it('correctly handles union types', function () {
        const example = '{% union-tag-1 foo=withUnion() bar=withUnion() /%}';
        expect(validate(example, schema)).toEqual([]);

        const example2 =
          '{% union-tag-1 foo=withUnion() bar=withUnion() baz=withUnion() /%}';
        expect(validate(example2, schema)).toDeepEqualSubset([
          {
            error: {
              id: 'attribute-type-invalid',
              message: "Attribute 'baz' must be type of 'Boolean'",
            },
          },
        ]);
      });

      it('correctly handles return types for nested function calls', function () {
        const example = '{% foo bar=nested(baz(), number()) /%}';
        expect(validate(example, schema)).toEqual([]);

        const example2 = '{% foo bar=nested(number(), baz()) /%}';
        expect(validate(example2, schema)).toDeepEqualSubset([
          {
            error: {
              id: 'parameter-type-invalid',
              message: "Parameter '0' of 'nested' must be type of 'String'",
            },
          },
          {
            error: {
              id: 'parameter-type-invalid',
              message: "Parameter '1' of 'nested' must be type of 'Number'",
            },
          },
        ]);
      });

      it('accepts a correct return type', function () {
        expect(validate(example, schema)).toEqual([]);
      });

      it('correctly handles no return type', function () {
        const modifiedSchema = {
          ...schema,
          functions: { baz: {} },
        };

        expect(validate(example, modifiedSchema)).toEqual([]);
      });

      it('identifies an incorrect return type', function () {
        const modifiedSchema = {
          ...schema,
          functions: { baz: { returns: Number } },
        };
        expect(validate(example, modifiedSchema)).toDeepEqualSubset([
          { error: { id: 'attribute-type-invalid' } },
        ]);
      });
    });

    describe('checks parameters', function () {
      const schema = {
        validation: { validateFunctions: true },
        functions: {
          baz: {
            returns: String,
            parameters: {},
          },
          qux: {
            returns: String,
            parameters: {
              test: { type: String },
            },
          },
          noTyping: {},
          requiredParam: {
            returns: String,
            parameters: {
              test: { type: String },
              req: { type: String, required: true },
            },
          },
        },
        tags: {
          foo: {
            attributes: {
              bar: { type: String },
            },
          },
        },
      };

      it('with a missing optional parameter', function () {
        expect(validate('{% foo bar=qux() /%}', schema)).toEqual([]);
      });

      it('with a missing required parameter', function () {
        expect(
          validate('{% foo bar=requiredParam() /%}', schema)
        ).toDeepEqualSubset([
          {
            error: {
              id: 'parameter-missing-required',
              message: "Missing required parameter: 'req'",
            },
          },
        ]);
      });

      describe('accepts defined parameters', function () {
        it('with keyed parameter', function () {
          expect(
            validate('{% foo bar=qux(test="example") /%}', schema)
          ).toEqual([]);
        });
      });

      it('ignores parameters when there is no typing', function () {
        expect(validate('{% foo bar=noTyping(foo=1) /%}', schema)).toEqual([]);
      });

      describe('rejects undeclared parameters', function () {
        it('with a keyed parameter', function () {
          const output = validate('{% foo bar=baz(foo=1) /%}', schema);
          expect(output).toDeepEqualSubset([
            {
              type: 'tag',
              error: {
                id: 'parameter-undefined',
                message: "Invalid parameter: 'foo'",
              },
            },
          ]);
        });

        it('with a positional parameter', function () {
          expect(validate('{% foo bar=baz(1) /%}', schema)).toDeepEqualSubset([
            {
              type: 'tag',
              error: {
                id: 'parameter-undefined',
                message: "Invalid parameter: '0'",
              },
            },
          ]);

          expect(
            validate('{% foo bar=baz(1, test=2) /%}', schema)
          ).toDeepEqualSubset([
            {
              type: 'tag',
              error: {
                id: 'parameter-undefined',
                message: "Invalid parameter: '0'",
              },
            },
          ]);
        });
      });
    });
  });

  describe('attribute validation', () => {
    it('should return error on failure to match array', () => {
      const example = '{% foo jawn="cat" /%}';
      const schema = {
        tags: {
          foo: {
            attributes: {
              jawn: {
                type: String,
                matches: ['bar', 'baz', 'bat'],
              },
            },
          },
        },
      };

      expect(validate(example, schema)).toDeepEqualSubset([
        {
          type: 'tag',
          error: {
            id: 'attribute-value-invalid',
            message: `Attribute 'jawn' must match one of ["bar","baz","bat"]. Got 'cat' instead.`,
          },
        },
      ]);
    });

    // https://github.com/markdoc/markdoc/issues/122
    it('should validate partial file attributes', () => {
      const example = `{% partial file="non-existent.md" /%}`;
      const output = validate(example, {});

      expect(output).toDeepEqualSubset([
        {
          type: 'tag',
          error: {
            id: 'attribute-value-invalid',
            level: 'error',
            message:
              "Partial `non-existent.md` not found. The 'file' attribute must be set in `config.partials`",
          },
        },
      ]);
    });
  });

  describe('custom type registration example', () => {
    class Link {
      validate(value) {
        if (value.startsWith('http')) {
          return [];
        }

        const error: ValidationError = {
          id: 'attribute-type-invalid',
          level: 'error',
          message: "Attribute 'href' must be type of 'Link'",
        };

        return [error];
      }
    }

    it('should return error on failure', () => {
      const example = '{% link href="/relative-link"  /%}';
      const output = validate(example, {
        tags: {
          link: {
            render: 'a',
            attributes: {
              href: {
                type: Link,
              },
            },
          },
        },
      });

      expect(output).toDeepEqualSubset([
        {
          type: 'tag',
          error: {
            id: 'attribute-type-invalid',
            level: 'error',
            message: "Attribute 'href' must be type of 'Link'",
          },
        },
      ]);
    });

    it('should return no errors when valid', () => {
      const example = '{% link href="http://google.com"  /%}';
      const output = validate(example, {
        tags: {
          link: {
            render: 'a',
            selfClosing: true,
            attributes: {
              href: {
                type: Link,
              },
            },
          },
        },
      });

      expect(output).toEqual([]);
    });
  });

  describe('variable validation', () => {
    it('should only validate if the variables config is passed', () => {
      const example = `{% $valid.variable %}`;
      const output = validate(example, {});

      expect(output).toEqual([]);
    });

    it('should warn against missing variables', () => {
      const example = `{% $undefinedVariable %}`;
      const output = validate(example, { variables: {} });

      expect(output).toDeepEqualSubset([
        {
          type: 'text',
          error: {
            id: 'variable-undefined',
            level: 'error',
            message: "Undefined variable: 'undefinedVariable'",
          },
        },
      ]);
    });

    it('should not warn if variable exists', () => {
      const example = `{% $valid.variable %}`;
      const output = validate(example, {
        variables: { valid: { variable: false } },
      });

      expect(output).toEqual([]);
    });
  });

  it('should not error for missing support for code_block', () => {
    const example = `   # https://spec.commonmark.org/0.30/#indented-code-block
    4-space indented code`;
    const output = validate(example, {});

    expect(output).toEqual([]);
  });

  describe('async support', () => {
    it('should allow async validators', async () => {
      const doc = `![img](/src)`;

      const config = {
        nodes: {
          image: {
            ...nodes.image,
            async validate() {
              const message = await new Promise((res) => res('Error!'));
              return [{ message }];
            },
          },
        },
      };

      const errors = await validate(doc, config);

      expect(errors).toDeepEqualSubset([
        {
          type: 'image',
          lines: [0, 1],
          location: {},
          error: { message: 'Error!' },
        },
      ]);
    });
  });
});
