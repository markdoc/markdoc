import type MarkdownIt from 'markdown-it/lib';
import type StateBlock from 'markdown-it/lib/rules_block/state_block';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';

const OPEN = '<!--';
const CLOSE = '-->';

function block(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  if (!state.src.startsWith(OPEN, start)) return false;

  const close = state.src.indexOf(CLOSE, start);

  if (!close) return false;
  if (silent) return true;

  const content = state.src.slice(start + OPEN.length, close);
  const lines = content.split('\n').length;
  const token = state.push('comment', '', 0);
  token.content = content.trim();
  token.map = [startLine, startLine + lines];
  state.line = close;

  return true;
}

function inline(state: StateInline, silent: boolean): boolean {
  if (!state.src.startsWith(OPEN, state.pos)) return false;

  const close = state.src.indexOf(CLOSE, state.pos);

  if (!close) return false;
  if (silent) return true;

  const token = state.push('comment', '', 0);
  token.content = state.src.slice(state.pos + OPEN.length, close).trim();
  state.pos = close + CLOSE.length;

  return true;
}

export default function plugin(md: MarkdownIt) {
  md.block.ruler.before('table', 'comment', block, {alt: ['paragraph']});
  md.inline.ruler.push('comment', inline);
}
