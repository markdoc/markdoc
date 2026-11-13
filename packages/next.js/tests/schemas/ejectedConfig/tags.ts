import type {MarkdocNextJsSchema} from '../../../src';

export const tag: MarkdocNextJsSchema<{extraValue: string}> = {
  transform(node, config: any) {
    return config.extraValue;
  },
};
