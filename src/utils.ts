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

export const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isIdentifier(s: any): s is string {
  return typeof s === 'string' && IDENTIFIER_REGEX.test(s);
}

export function isPromise(a: any): a is Promise<any> {
  return a && typeof a === 'object' && typeof a.then === 'function';
}

export interface InterpolationResult {
  result: string;
  undefinedVariables: string[];
}

export function interpolateString(value: string, variables?: Record<string, any>): InterpolationResult {
  const undefinedVariables: string[] = [];
  
  const result = value.replace(/\$([a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*)/g, (match, path) => {
    if (!variables) return match;
    
    const pathParts = path.split('.');
    let variableValue = variables;
    
    for (const part of pathParts) {
      if (variableValue && typeof variableValue === 'object' && part in variableValue) {
        variableValue = variableValue[part];
      } else {
        undefinedVariables.push(path);
        return match;
      }
    }
    
    return String(variableValue);
  });
  
  return { result, undefinedVariables };
}

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

  return null;
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

    const end = findTagEnd(content, pos);

    if (end == null) {
      // If we cannot find the closing tag, we skip over it
      pos = pos + OPEN.length;
      continue;
    }

    const text = content.slice(pos, end + CLOSE.length);
    const inner = content.slice(pos + OPEN.length, end);
    const lineStart = content.lastIndexOf('\n', pos);
    const lineEnd = content.indexOf('\n', end);
    const lineContent = content.slice(lineStart, lineEnd);
    const tag = parseTag(inner.trim(), line, pos - lineStart);

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
