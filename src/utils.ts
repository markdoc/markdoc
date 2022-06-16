import { parse, SyntaxError } from './grammar/tag';
import Variable from './ast/variable';
import Function from './ast/function';

import type Token from 'markdown-it/lib/token';

enum STATES {
  normal,
  string,
  escape,
}

export const OPEN = '{%';
export const CLOSE = '%}';

export function findTagEnd(content: string, start = 0) {
  let state = STATES.normal;
  for (let pos = start; pos < content.length; pos++) {
    const char = content[pos];

    switch (state) {
      case STATES.string:
        switch (char) {
          case '"':
            state = STATES.normal;
            break;
          case '\\':
            state = STATES.escape;
            break;
        }
        break;
      case STATES.escape:
        state = STATES.string;
        break;
      case STATES.normal:
        if (char === '"') state = STATES.string;
        else if (content.startsWith(CLOSE, pos)) return pos;
    }
  }
}

function parseTag(content: string, line: number, contentStart: number) {
  try {
    return parse(content, { Variable, Function });
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const {
      message,
      location: { start, end },
    } = error as SyntaxError;
    const location = {
      start: { line, character: start.offset + contentStart },
      end: { line: line + 1, character: end.offset + contentStart },
    };

    return { type: 'error', meta: { error: { message, location } } };
  }
}

export function parseTags(content: string, firstLine = 0): Token[] {
  let line = firstLine + 1;
  const output = [];
  let start = 0;

  for (let pos = 0; pos < content.length; pos++) {
    if (content[pos] === '\n') {
      line++;
      continue;
    }

    if (!content.startsWith(OPEN, pos)) continue;

    const end = findTagEnd(content, pos) || 0;
    const text = content.slice(pos, end + CLOSE.length);
    const inner = content.slice(pos + OPEN.length, end).trim();
    const lineStart = content.lastIndexOf('\n', pos);
    const lineEnd = content.indexOf('\n', end);
    const lineContent = content.slice(lineStart, lineEnd);

    if (!inner.length) continue;
    const tag = parseTag(inner, line, pos - lineStart);

    // Throw away excess whitespace introduced by block-level tags
    const precedingTextEnd = lineContent.trim() === text ? lineStart : pos;
    const precedingText = content.slice(start, precedingTextEnd);

    output.push({
      type: 'text',
      start,
      end: pos - 1,
      content: precedingText,
    });

    output.push({
      map: [line, line + 1],
      position: {
        start: pos - lineStart,
        end: pos - lineStart + text.length,
      },
      start: pos,
      end: pos + text.length - 1,
      info: text,
      ...tag,
    });

    start = end + CLOSE.length;
    pos = start - 1;
  }

  output.push({
    type: 'text',
    start,
    end: content.length - 1,
    content: content.slice(start),
  });

  return output;
}
