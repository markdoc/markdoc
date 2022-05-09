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
