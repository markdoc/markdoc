import type {MarkdocNextJsSchema} from '@markdoc/next.js';

export const tag: MarkdocNextJsSchema = {
  transform(node, config) {
    return config.source;
  },
};
