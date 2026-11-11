import type { MarkdownItOptions } from 'markdown-it';
import type { TokenizerOptions } from '../../src/tokenizer';

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

// Fail when a parser upgrade adds an option or changes an option's type, so
// the self-contained public options continue to describe the bundled parser.
export type CompatibleOptions = Assert<
  Equal<Pick<TokenizerOptions, keyof MarkdownItOptions>, MarkdownItOptions>
>;
