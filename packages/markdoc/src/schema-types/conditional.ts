import {
  Config,
  CustomAttributeTypeInterface,
  ValidationError,
} from '../types';

/**
 * Conditional attribute type for Markdoc {% if /%} and {% else /%} tags.
 *
 * Acceptable values are:
 * - `boolean` (true or false)
 * - `null` or `undefined` (in case of using variable that's not defined)
 * - `object`
 */
export class ConditionalAttributeType implements CustomAttributeTypeInterface {
  validate(value: any, _config: Config, key: string): ValidationError[] {
    if (
      typeof value === 'boolean' ||
      value === null ||
      value === undefined ||
      typeof value === 'object'
    ) {
      return [];
    }

    return [
      {
        id: 'attribute-type-invalid',
        level: 'error',
        message: `Attribute '${key}' must be type 'boolean | object' (null or undefined are also allowed)`,
      },
    ];
  }
}
