import { CustomAttributeTypeInterface, ValidationError } from '../types';

export class Id implements CustomAttributeTypeInterface {
  validate(value: any): ValidationError[] {
    if (typeof value === 'string' && value.match(/^[a-zA-Z]/)) return [];

    return [
      {
        id: 'attribute-value-invalid',
        level: 'error',
        message: "The 'id' attribute must start with a letter",
      },
    ];
  }
}
