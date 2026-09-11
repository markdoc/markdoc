import { findTagEnd, OPEN, CLOSE, parseTags } from '../../utils';
import { parse, SyntaxError } from '../../grammar/tag';
import Variable from '../../ast/variable';
import Function from '../../ast/function';

import type { AttributeValue, Token } from '../../types';
import type MarkdownIt from 'markdown-it';

type StateBlock = MarkdownIt.StateBlock;
type StateInline = MarkdownIt.StateInline;
type StateCore = MarkdownIt.StateCore;
type StateWithDelimiters = (StateBlock | StateInline) & {
  delimiters?: MarkdownIt.Delimiter[];
};
// `state.tokens` in `core()` below are always real markdown-it tokens (never
// the lightweight pseudo-tokens `parseTags` builds), so `info`/`content`/
// `tag` are guaranteed non-optional strings. `errors` is Markdoc's own
// extension, bolted on at runtime, and `children`/`meta` get overwritten
// below with Markdoc's own pseudo-tokens/tag metadata rather than real
// markdown-it tokens.
type FenceToken = Omit<MarkdownIt.Token, 'children' | 'meta'> &
  Pick<Token, 'errors' | 'children' | 'meta'>;

function createToken(
  state: StateWithDelimiters,
  content: string,
  contentStart?: number
): Token {
  try {
    const { type, meta, nesting = 0 } = parse(content, { Variable, Function });
    const token = state.push(type, '', nesting);
    token.info = content;
    token.meta = meta;

    if (!state.delimiters) {
      state.delimiters = [];
    }

    return token;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;

    const {
      message,
      location: { start, end },
    } = error as SyntaxError;
    const location = contentStart
      ? {
          start: { offset: start.offset + contentStart },
          end: { offset: end.offset + contentStart },
        }
      : null;

    const token = state.push('error', '', 0);
    token.meta = { error: { message, location } };
    return token;
  }
}

function block(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const finish = state.eMarks[startLine];

  if (!state.src.startsWith(OPEN, start)) return false;

  const tagEnd = findTagEnd(state.src, start);
  const lastPossible = state.src.slice(0, finish).trim().length;

  if (!tagEnd || tagEnd < lastPossible - CLOSE.length) return false;

  const contentStart = start + OPEN.length;
  const content = state.src.slice(contentStart, tagEnd).trim();
  const lines = state.src
    .slice(start, tagEnd + CLOSE.length)
    .split('\n').length;

  if (content[0] === '$') return false;

  if (silent) return true;

  const token = createToken(state, content, contentStart);
  token.map = [startLine, startLine + lines];
  state.line += lines;
  return true;
}

function inline(state: StateInline, silent: boolean): boolean {
  if (!state.src.startsWith(OPEN, state.pos)) return false;

  const tagEnd = findTagEnd(state.src, state.pos);
  if (!tagEnd) return false;

  const content = state.src.slice(state.pos + OPEN.length, tagEnd);
  if (!silent) createToken(state, content.trim());

  state.pos = tagEnd + CLOSE.length;
  return true;
}

function core(state: StateCore) {
  for (const raw of state.tokens) {
    if (raw.type !== 'fence') continue;

    // Widening, not casting: `errors` is optional on FenceToken, and
    // `raw`'s real markdown-it `children`/`meta` values satisfy Markdoc's
    // looser typing for those fields, so this assignment is a plain
    // structural upcast the compiler verifies on its own.
    const token: FenceToken = raw;
    if (!token.map) continue;

    if (token.info.includes(OPEN)) {
      const start = token.info.indexOf(OPEN);
      const end = findTagEnd(token.info, start);
      const content = token.info.slice(start + OPEN.length, end ?? undefined);

      try {
        const { meta } = parse(content.trim(), { Variable, Function });
        token.meta = meta;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        if (!token.errors) token.errors = [];
        token.errors.push({
          id: 'fence-tag-error',
          level: 'error',
          message: `Syntax error in fence tag: ${
            (error as SyntaxError).message
          }`,
        });
      }
    }

    if (
      token?.meta?.attributes?.find(
        (attr: AttributeValue) => attr.name === 'process' && !attr.value
      )
    )
      continue;

    token.children = parseTags(token.content, token.map[0]);
  }
}

export default function plugin(md: MarkdownIt.MarkdownIt /* options */) {
  md.block.ruler.before('paragraph', 'annotations', block, {
    alt: ['paragraph', 'blockquote'],
  });
  md.inline.ruler.push('containers', inline);
  md.core.ruler.push('annotations', core);
}
