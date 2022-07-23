import { globalAttributes } from './transformer';
import Ast from './ast/index';

import type {
  Node,
  Function,
  Config,
  SchemaAttribute,
  ValidationError,
  Value,
} from './types';

const TypeMappings = {
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  Boolean: Boolean,
} as const;

type TypeParam = NonNullable<SchemaAttribute['type']>;

export function validateType(
  type: TypeParam,
  node: Node,
  value: Value,
  config: Config
): boolean | ValidationError[] {
  if (!type) return true;

  if (Ast.isFunction(value) && config.validation?.validateFunctions) {
    const schema = config.functions?.[value.name];
    return !schema?.returns
      ? true
      : Array.isArray(schema.returns)
      ? schema.returns.find((t) => t === type) !== undefined
      : schema.returns === type;
  }

  if (Ast.isAst(value)) return true;

  if (Array.isArray(type))
    return type.some((t) => validateType(t, node, value, config));

  if (typeof type === 'string') type = TypeMappings[type];

  if (typeof type === 'function') {
    const instance: any = new type();
    if (instance.validate) {
      return instance.validate(value, node, config);
    }
  }

  return value != null && value.constructor === type;
}

function typeToString(type: TypeParam): string {
  if (typeof type === 'string') return type;

  if (Array.isArray(type)) return type.map(typeToString).join(' | ');

  return type.name;
}

function validateFunction(
  fn: Function,
  node: Node,
  config: Config
): ValidationError[] {
  const schema = config.functions?.[fn.name];
  const errors: ValidationError[] = [];

  if (!schema)
    return [
      {
        id: 'function-undefined',
        level: 'critical',
        message: `Undefined function: '${fn.name}'`,
        location: node.location,
      },
    ];

  if (schema.validate) errors.push(...schema.validate(fn, config));

  if (schema.parameters) {
    for (const [key, value] of Object.entries(fn.parameters)) {
      const param = schema.parameters?.[key];

      if (!param) {
        errors.push({
          id: 'parameter-undefined',
          level: 'error',
          message: `Invalid parameter: '${key}'`,
          location: node.location,
        });

        continue;
      }

      if (Ast.isAst(value) && !Ast.isFunction(value)) continue;

      if (param.type) {
        const valid = validateType(param.type, node, value, config);
        if (valid === false) {
          errors.push({
            id: 'parameter-type-invalid',
            level: 'error',
            message: `Parameter '${key}' of '${
              fn.name
            }' must be type of '${typeToString(param.type)}'`,
            location: node.location,
          });
        } else if (Array.isArray(valid)) {
          errors.push(...valid);
        }
      }
    }
  }

  for (const [key, { required }] of Object.entries(schema.parameters ?? {}))
    if (required && fn.parameters[key] === undefined)
      errors.push({
        id: 'parameter-missing-required',
        level: 'error',
        message: `Missing required parameter: '${key}'`,
        location: node.location,
      });

  return errors;
}

export default function validate(node: Node, config: Config) {
  const schema = node.findSchema(config);
  const errors: ValidationError[] = [...(node.errors || [])];

  if (!schema) {
    errors.push({
      id: node.tag ? 'tag-undefined' : 'node-undefined',
      level: 'critical',
      message: node.tag
        ? `Undefined tag: '${node.tag}'`
        : `Undefined node: '${node.type}'`,
      location: node.location,
    });

    return errors;
  }

  if (schema.selfClosing && node.children.length > 0)
    errors.push({
      id: 'tag-selfclosing-has-children',
      level: 'critical',
      message: `'${node.tag}' tag should be self-closing`,
      location: node.location,
    });

  const attributes = {
    ...globalAttributes,
    ...schema.attributes,
  };

  if (schema.validate) errors.push(...schema.validate(node, config));

  for (let [key, value] of Object.entries(node.attributes)) {
    const attrib = attributes[key];

    if (!attrib) {
      errors.push({
        id: 'attribute-undefined',
        level: 'error',
        message: `Invalid attribute: '${key}'`,
        location: node.location,
      });

      continue;
    }

    let { type, matches, errorLevel } = attrib;

    if (Ast.isAst(value)) {
      if (Ast.isFunction(value) && config.validation?.validateFunctions)
        errors.push(...validateFunction(value, node, config));
      else continue;
    }

    value = value as string;
    if (key === 'id' && value.match(/^[0-9]/))
      errors.push({
        id: 'attribute-value-invalid',
        level: 'error',
        message: 'The id attribute must not start with a number',
        location: node.location,
      });

    if (type) {
      const valid = validateType(type, node, value, config);
      if (valid === false) {
        errors.push({
          id: 'attribute-type-invalid',
          level: errorLevel || 'error',
          message: `Attribute '${key}' must be type of '${typeToString(type)}'`,
          location: node.location,
        });
      }
      if (Array.isArray(valid)) {
        errors.push(...valid);
      }
    }

    if (typeof matches === 'function') matches = matches(config);

    if (Array.isArray(matches) && !matches.includes(value))
      errors.push({
        id: 'attribute-value-invalid',
        level: errorLevel || 'error',
        message: `Attribute '${key}' must match one of ${JSON.stringify(
          matches
        )}`,
        location: node.location,
      });

    if (matches instanceof RegExp && !matches.test(value))
      errors.push({
        id: 'attribute-value-invalid',
        level: errorLevel || 'error',
        message: `Attribute '${key}' must match ${matches}`,
        location: node.location,
      });
  }

  for (const [key, { required }] of Object.entries(attributes))
    if (required && node.attributes[key] === undefined)
      errors.push({
        id: 'attribute-missing-required',
        level: 'error',
        message: `Missing required attribute: '${key}'`,
        location: node.location,
      });

  for (const { type } of node.children) {
    if (schema.children && type !== 'error' && !schema.children.includes(type))
      errors.push({
        id: 'child-invalid',
        level: 'warning',
        message: `Can't nest '${type}' in '${node.tag || node.type}'`,
        location: node.location,
      });
  }

  return errors;
}
