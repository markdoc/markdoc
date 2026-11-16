import type {MarkdocNextJsSchema} from '@markdoc/next.js';

export const tag: MarkdocNextJsSchema<{extraValue: string}> = {
  transform(node, config: any) {
    return config.extraValue;
  },
};
