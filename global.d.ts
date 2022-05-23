import { Delimiter } from 'markdown-it/lib/rules_inline/state_inline';
import type { ValidationError } from './src/types';

declare module 'markdown-it/lib/token' {
  export default class Token extends require('markdown-it/lib/token') {
    errors?: ValidationError[];
    position?: {
      start?: number;
      end?: number;
    };
  }
}

declare module 'markdown-it/lib/rules_block/state_block' {
  export default class Token extends require('markdown-it/lib/rules_block/state_block') {
    delimiters?: Delimiter[];
  }
}
