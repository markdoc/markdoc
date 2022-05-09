import type MarkdownIt from 'markdown-it/lib';
import type StateBlock from 'markdown-it/lib/rules_block/state_block';

const fence = '---';

function getLine(state: StateBlock, n: number) {
  return state.src.slice(state.bMarks[n], state.eMarks[n]).trim();
}

function findClose(state: StateBlock, endLine: number) {
  for (let line = 1; line < endLine; line++)
    if (getLine(state, line) === fence) return line;
}

function block(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean
): boolean {
  if (startLine != 0 || getLine(state, 0) != fence) return false;

  const close = findClose(state, endLine);

  if (!close) return false;
  if (silent) return true;

  const token = state.push('frontmatter', '', 0);
  token.content = state.src.slice(state.eMarks[0], state.bMarks[close]).trim();
  token.map = [0, close];
  token.hidden = true;

  state.line = close + 1;
  return true;
}

export default function plugin(md: MarkdownIt /* options */) {
  md.block.ruler.before('hr', 'frontmatter', block);
}
