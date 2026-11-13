import type {MarkdocNextJsSchema} from '../../../src';

export const tag: MarkdocNextJsSchema = {
  transform(node, config) {
    return config.source;
  },
};
