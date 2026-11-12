import Markdoc, { Node, Tag, nodes } from '../index';
import type { Config, ValidationError } from './types';

function validate(string, config) {
  return Markdoc.validate(Markdoc.parse(string), config);
}

describe('validate', function () {
  describe('prototype-safe attributes', function () {
    let config: Config;
    let customValidate: jasmine.Spy;
    const unsafe = 'javascript:alert(1)';
    const trusted = 'https://trusted.example/embed';
    const React = {
      Fragment: 'fragment',
      createElement(name, attributes, ...children) {
        return { name, attributes, children };
      },
    };

    beforeEach(function () {
      customValidate = jasmine.createSpy('validate').and.callFake((value) =>
        value === trusted
          ? []
          : [
              {
                id: 'untrusted-src',
                level: 'critical',
                message: 'Untrusted URL',
              },
            ]
      );
      config = {
        tags: {
          embed: {
            render: 'iframe',
            selfClosing: true,
            attributes: {
              src: {
                type: String,
                required: true,
                matches: /^https:\/\/trusted\.example\//,
                errorLevel: 'critical',
                validate: customValidate,
              },
            },
          },
        },
      };
    });

    it('validates direct values with the pattern and custom validator', function () {
      const ast = Markdoc.parse(`{% embed src="${unsafe}" /%}`);
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-value-invalid', level: 'critical' } },
        { error: { id: 'untrusted-src', level: 'critical' } },
      ]);
      expect(customValidate).toHaveBeenCalledWith(
        unsafe,
        jasmine.anything(),
        'src'
      );
    });

    it('enforces the URL schema when only errors and critical findings block rendering', function () {
      delete config.tags!.embed.attributes!.src.validate;
      const render = (source: string) => {
        const ast = Markdoc.parse(source);
        const findings = Markdoc.validate(ast, config);
        if (
          findings.some(({ error }) =>
            ['error', 'critical'].includes(error.level)
          )
        )
          return null;
        return Markdoc.renderers.html(Markdoc.transform(ast, config));
      };

      expect(render(`{% embed src="${unsafe}" /%}`)).toBeNull();
      expect(render(`{% embed __proto__={src:"${unsafe}"} /%}`)).toBeNull();
      expect(render(`{% embed src="${trusted}" /%}`)).toBe(
        `<article><iframe src="${trusted}"></iframe></article>`
      );
    });

    it('blocks prototype attribute smuggling before rendering', function () {
      const ast = Markdoc.parse(`{% embed __proto__={src:"${unsafe}"} /%}`);
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-name-invalid', level: 'critical' } },
        { error: { id: 'attribute-missing-required', level: 'error' } },
      ]);
      expect(customValidate).not.toHaveBeenCalled();
      expect(Object.keys(ast.children[0].attributes)).toEqual([]);
      const output = Markdoc.transform(ast.children[0], config);
      expect(Markdoc.renderers.html(output)).toBe('<iframe></iframe>');
      expect(Markdoc.renderers.react(output, React)).toDeepEqual({
        name: 'iframe',
        attributes: null,
        children: [],
      });
    });

    it('still applies type validation to own values', function () {
      const ast = Markdoc.parse('{% embed src=42 /%}');
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-type-invalid', level: 'critical' } },
        { error: { id: 'attribute-value-invalid', level: 'critical' } },
        { error: { id: 'untrusted-src', level: 'critical' } },
      ]);
    });

    it('validates an unsafe own value despite a smuggling attempt', function () {
      const ast = Markdoc.parse(
        `{% embed __proto__={src:"${trusted}"} src="${unsafe}" /%}`
      );
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-name-invalid', level: 'critical' } },
        { error: { id: 'attribute-value-invalid', level: 'critical' } },
        { error: { id: 'untrusted-src', level: 'critical' } },
      ]);
      expect(customValidate).toHaveBeenCalledWith(
        unsafe,
        jasmine.anything(),
        'src'
      );
    });

    it('validates and renders an own value despite a smuggling attempt', function () {
      const ast = Markdoc.parse(
        `{% embed __proto__={src:"${unsafe}"} src="${trusted}" /%}`
      );
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-name-invalid', level: 'critical' } },
      ]);
      expect(customValidate).toHaveBeenCalledWith(
        trusted,
        jasmine.anything(),
        'src'
      );
      expect(
        Markdoc.renderers.html(Markdoc.transform(ast.children[0], config))
      ).toBe(`<iframe src="${trusted}"></iframe>`);
    });

    it('ignores inherited attributes on a programmatically modified node', function () {
      const node = new Node('tag', {}, [], 'embed');
      node.attributes = Object.create({ src: unsafe });
      expect(Markdoc.validate(node, config)).toDeepEqualSubset([
        { error: { id: 'attribute-missing-required', level: 'error' } },
      ]);
      expect(node.transformAttributes(config).src).toBeUndefined();
      expect(Markdoc.renderers.html(Markdoc.transform(node, config))).toBe(
        '<iframe></iframe>'
      );
    });

    it('applies defaults instead of inherited values', function () {
      config.tags!.embed.attributes!.src.default = trusted;
      const node = new Node('tag', {}, [], 'embed');
      node.attributes = Object.create({ src: unsafe });
      expect(node.transformAttributes(config).src).toBe(trusted);
    });

    it('rejects undeclared attributes whose names exist on Object.prototype', function () {
      const ast = Markdoc.parse('{% embed toString="value" /%}');
      expect(Markdoc.validate(ast, config)).toDeepEqualSubset([
        { error: { id: 'attribute-undefined', level: 'error' } },
        { error: { id: 'attribute-missing-required', level: 'error' } },
      ]);
    });

    it('resolves variables in prototype-free attribute dictionaries', function () {
      config.variables = { url: trusted };
      const ast = Markdoc.parse('{% embed src=$url /%}');
      expect(Markdoc.validate(ast.resolve(config), config)).toEqual([]);
      expect(Markdoc.transform(ast.children[0], config)).toDeepEqual(
        new Tag('iframe', { src: trusted })
      );
    });
  });

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

  describe('inline rule', () => {
    const config = {
      tags: {
        foo: { inline: true },
        bar: { inline: false },
        baz: {},
      },
    };

    it('allows inline or block when undefined', () => {
      const inline = validate(`this is inline {% baz %}bar{% /baz %}`, config);
      expect(inline).toEqual([]);

      const block = validate(
        `
{% baz %}
bar
{% /baz %}
      `,
        config
      );
      expect(block).toEqual([]);
    });

    it('validates inline tag', () => {
      const correct = validate(`this is inline {% foo %}bar{% /foo %}`, config);
      expect(correct).toEqual([]);

      const wrong = validate(
        `
{% foo %}
bar
{% /foo %}
      `,
        config
      );
      expect(wrong[0]?.error.id).toEqual('tag-placement-invalid');
      expect(wrong[0]?.error.message).toContain('should be inline');
    });

    it('validates block tag', () => {
      const correct = validate(
        `
{% bar %}
bar
{% /bar %}
`,
        config
      );
      expect(correct).toEqual([]);
      const wrong = validate(`this is inline {% bar %}bar{% /bar %}`, config);
      expect(wrong[0]?.error.id).toEqual('tag-placement-invalid');
      expect(wrong[0]?.error.message).toContain('should be block');
    });
  });

  describe('attribute validation', () => {
    describe('with a validate function', () => {
      it('using simple conditional', () => {
        const schema = {
          tags: {
            foo: {
              attributes: {
                bar: {
                  type: Number,
                  validate(value, _config) {
                    return value > 10
                      ? []
                      : [
                          {
                            id: 'attribute-should-be-greater-than-ten',
                            message:
                              'Attribute "bar" must have value greater than 10.',
                          },
                        ];
                  },
                },
              },
            },
          },
        };

        expect(validate(`{% foo bar=20 /%}`, schema)).toEqual([]);
        expect(validate(`{% foo bar=5 /%}`, schema)).toDeepEqualSubset([
          {
            type: 'tag',
            error: {
              id: 'attribute-should-be-greater-than-ten',
              message: 'Attribute "bar" must have value greater than 10.',
            },
          },
        ]);
      });
    });

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

    it('Elides excess values in matches check', () => {
      const example = '{% foo jawn="cat" /%}';
      const schema = {
        tags: {
          foo: {
            attributes: {
              jawn: {
                type: String,
                matches: Array.from('foobarbazqux'),
              },
            },
          },
        },
      };

      const output = validate(example, schema);
      expect(output).toDeepEqualSubset([
        {
          type: 'tag',
          error: {
            id: 'attribute-value-invalid',
            message: `Attribute 'jawn' must match one of ["f","o","o","b","a","r","b","a", ... 4 more]. Got 'cat' instead.`,
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

    it('properly validates ids', () => {
      const correct = validate(`# foo {% #bar %}`, {});
      expect(correct).toEqual([]);

      const number = validate(`# foo {% #1bar %}`, {});
      expect(number[0]?.error.id).toEqual('attribute-value-invalid');

      const hash = validate(`# foo {% id="#bar" %}`, {});
      expect(hash[0]?.error.id).toEqual('attribute-value-invalid');
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

  describe('attribute validation key', () => {
    it('simple case', () => {
      const example = `{% foo bar={baz: 3} /%}`;

      function validator(value, config, name) {
        return value.baz < 5
          ? [
              {
                id: 'invalid-foo-bar',
                level: 'error',
                message: `The value of '${name}.baz' must be less than five`,
              },
            ]
          : [];
      }

      const config = {
        tags: {
          foo: {
            attributes: {
              bar: {
                type: Object,
                validate: validator,
              },
              blah: {
                type: Object,
                validate: validator,
              },
            },
          },
        },
      };

      const errs = validate(example, config);
      expect(errs[0].error.message).toEqual(
        "The value of 'bar.baz' must be less than five"
      );
    });

    it('custom attribute type', () => {
      const example = `{% foo bar={baz: 3} /%}`;

      class CustomType {
        validate(value, config, name) {
          return value.baz < 5
            ? [
                {
                  id: 'invalid-foo-bar',
                  level: 'error',
                  message: `The value of '${name}.baz' must be less than five`,
                },
              ]
            : [];
        }
      }

      const config = {
        tags: {
          foo: {
            attributes: {
              bar: {
                type: CustomType,
              },
              blah: {
                type: CustomType,
              },
            },
          },
        },
      };

      const errs = validate(example, config);
      expect(errs[0].error.message).toEqual(
        "The value of 'bar.baz' must be less than five"
      );
    });
  });

  describe('parent validation', () => {
    it('for deep nesting', () => {
      const doc = `
{% foo %}
{% bar %}
{% baz %}
# testing
{% /baz %}
{% /bar %}
{% /foo %}
`;

      const doc2 = `
{% foo %}
{% bar %}
{% /bar %}
{% /foo %}

{% bar %}
{% baz %}
# testing
{% /baz %}
{% /bar %}
`;

      const config = {
        tags: {
          foo: {},
          bar: {},
          baz: {},
        },
        nodes: {
          heading: {
            ...Markdoc.nodes.heading,
            validate(node, config) {
              if (config.validation.parents.find((p) => p.tag === 'foo'))
                return [
                  {
                    id: 'heading-in-foo',
                    level: 'error',
                    message: "Can't nest a heading in tag 'foo'",
                  },
                ];

              return [];
            },
          },
        },
      };

      const errors = validate(doc, config);
      expect(errors.length).toEqual(1);
      expect(errors[0].error.id).toEqual('heading-in-foo');

      const errors2 = validate(doc2, config);
      expect(errors2.length).toEqual(0);
    });

    it('with function validation enabled', () => {
      const doc = `{% foo %}{% bar %}this is a test{% /bar %}{% /foo %}`;

      const config: Config = {
        validation: {
          validateFunctions: true,
        },
        tags: {
          foo: {},
          bar: {
            validate(node, config) {
              const parents = config?.validation?.parents?.map((p) => p.type);
              expect(parents).toDeepEqual([
                'document',
                'paragraph',
                'inline',
                'tag',
              ]);
              return [];
            },
          },
        },
      };

      validate(doc, config);
    });
  });
});
