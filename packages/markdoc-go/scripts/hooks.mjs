// Code that config fixtures refer to with {$hook: name}: custom attribute
// types, validate and transform functions. hooks_test.go implements each one
// identically in Go.

export function makeHooks(Markdoc) {
  const { Tag } = Markdoc;
  const lessThanFive = (value, _config, name) =>
    value?.baz < 5
      ? [
          {
            id: 'invalid-foo-bar',
            level: 'error',
            message: `The value of '${name}.baz' must be less than five`,
          },
        ]
      : [];

  return {
    // Attribute types
    Link: class Link {
      validate(value) {
        if (typeof value === 'string' && value.startsWith('http')) return [];
        return [
          {
            id: 'attribute-type-invalid',
            level: 'error',
            message: "Attribute 'href' must be type of 'Link'",
          },
        ];
      }
    },
    BazLessThanFive: class BazLessThanFive {
      validate(value, config, name) {
        return lessThanFive(value, config, name);
      }
    },
    UpperCaseString: class UpperCaseString {
      transform(value) {
        return typeof value === 'string' ? value.toUpperCase() : value;
      }
    },
    NonNullString: class NonNullString {
      transform(value) {
        return value || '';
      }
    },

    // Attribute validate functions
    greaterThanTen(value) {
      return value > 10
        ? []
        : [
            {
              id: 'attribute-should-be-greater-than-ten',
              message: 'Attribute "bar" must have value greater than 10.',
            },
          ];
    },
    bazLessThanFive: lessThanFive,

    // Schema validate functions
    headingInFoo(_node, config) {
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
    parents(_node, config) {
      return [
        {
          id: 'parents',
          level: 'info',
          message: config.validation.parents
            .map((p) => p.tag || p.type)
            .join(' > '),
        },
      ];
    },
    located() {
      return [
        {
          id: 'located',
          level: 'warning',
          message: 'Located',
          location: { start: { line: 10, character: 2 }, end: { line: 11 } },
        },
      ];
    },
    locatedInFile() {
      return [
        {
          id: 'located',
          level: 'warning',
          message: 'Located in another file',
          location: { file: 'other.md', start: { line: 1 }, end: { line: 2 } },
        },
      ];
    },

    // Function transforms and validators
    upper(parameters) {
      return String(parameters[0]).toUpperCase();
    },
    sum(parameters) {
      return Object.values(parameters).reduce((a, b) => a + b, 0);
    },
    keys(parameters) {
      return Object.keys(parameters).join(',');
    },
    echo(parameters) {
      return parameters;
    },
    requireX(fn) {
      return 'x' in fn.parameters
        ? []
        : [
            {
              id: 'needs-x',
              level: 'warning',
              message: `'${fn.name}' needs x`,
            },
          ];
    },

    // Schema transforms
    section(node, config) {
      return new Tag(
        'section',
        {
          ...node.transformAttributes(config),
          'data-count': node.children.length,
        },
        node.transformChildren(config),
      );
    },
    spread(node, config) {
      return [new Tag('hr'), ...node.transformChildren(config), 'tail'];
    },
    nothing() {
      return null;
    },
    undefinedResult() {
      return undefined;
    },
    primary(node) {
      return node.attributes.primary;
    },
    attributesOnly(node, config) {
      return { name: 'foo', attributes: node.transformAttributes(config) };
    },
  };
}
