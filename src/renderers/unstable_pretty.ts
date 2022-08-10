import { inspect } from 'util';
import Ast from '../ast';
import { OPEN, CLOSE } from '../utils';
import type { AttributeValue, Function, Node, NodeType, Value } from '../types';
import type Variable from '../ast/variable';

type Options = {
  allowIndentation?: boolean;
  parent?: Node;
  indent?: number;
};

const SPACE = ' ';
const NL = '\n';

const max = (a: number, b: number) => Math.max(a, b);
const increment = (o: Options, n = 2) => ({
  ...o,
  indent: (o.indent || 0) + n,
});

function* renderChildren(a: Node, options: Options) {
  for (const child of a.children) {
    yield* render(child, options);
  }
}

function* renderTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |`;
}

function renderValue(v: Value) {
  return Ast.isAst(v)
    ? UNSTABLE_DO_NOT_USE_pretty_render(v)
    : // TODO improve formatting
      inspect(v, { depth: null })
        .replace(/(?<!\\)'/g, '"')
        .replace(/\[ /g, '[')
        .replace(/ \]/g, ']')
        .replace(/\{ /g, '{')
        .replace(/ \}/g, '}');
}

function renderAnnotationValue(a: AttributeValue): string {
  if (a.name === 'primary') return a.value;
  if (a.name === 'id' && typeof a.value === 'string') return '#' + a.value;
  if (a.type === 'class') return '.' + a.name;
  return `${a.name}=${renderValue(a.value)}`;
}

function* renderAttributes(n: Node) {
  for (const [key, value] of Object.entries(n.attributes)) {
    yield ' ';
    if (key === 'class' && !Ast.isAst(value))
      yield Object.keys(value)
        .map((name) => renderAnnotationValue({ type: 'class', name, value }))
        .join(' ');
    else yield renderAnnotationValue({ type: 'attribute', name: key, value });
  }
}

function* renderAnnotations(n: Node) {
  if (n.annotations.length) {
    yield OPEN + SPACE;
    yield n.annotations.map(renderAnnotationValue).join(SPACE);
    yield SPACE + CLOSE;
  }
}

function* renderVariable(v: Variable) {
  yield '$';
  yield v.path.join('.');
}

function* renderFunction(f: Function) {
  yield f.name;
  yield '(';
  yield Object.values(f.parameters).map(renderValue).join(', ');
  yield ')';
}

// TODO handle trimStart without creating intermediate array
function trimStart(g: Generator): string {
  return [...g].join('').trimStart();
}

function* renderNode(n: Node, o: Options = {}) {
  const no = { ...o, parent: n };
  const indent = SPACE.repeat(no.indent || 0);

  switch (n.type as NodeType) {
    case 'document': {
      if (n.attributes.frontmatter && n.attributes.frontmatter.length) {
        yield '---' + NL + n.attributes.frontmatter + NL + '---' + NL + NL;
      }
      yield trimStart(renderChildren(n, no));
      break;
    }
    case 'heading': {
      yield NL;
      yield indent;
      yield '#'.repeat(n.attributes.level || 1);
      yield SPACE;
      yield* renderChildren(n, no);
      yield* renderAnnotations(n);
      yield NL;
      break;
    }
    case 'paragraph': {
      yield NL;
      yield indent;
      yield* renderChildren(n, no);
      yield* renderAnnotations(n);
      yield NL;
      break;
    }
    case 'inline': {
      yield* renderChildren(n, no);
      break;
    }
    case 'link': {
      yield '[';
      yield* renderChildren(n, no);
      yield ']';
      yield '(';
      yield* render(n.attributes.href, no);
      yield ')';
      break;
    }
    case 'text': {
      if (Ast.isAst(n.attributes.content)) yield OPEN + SPACE;
      yield* render(n.attributes.content, no);
      if (Ast.isAst(n.attributes.content)) yield SPACE + CLOSE;
      break;
    }
    case 'blockquote': {
      yield NL;
      yield indent;
      yield '> ';
      yield trimStart(renderChildren(n, no));
      break;
    }
    case 'hr': {
      yield NL;
      yield indent;
      yield '---';
      yield NL;
      break;
    }
    case 'image': {
      yield '!';
      yield '[';
      yield* render(n.attributes.alt, no);
      yield ']';
      yield '(';
      yield* render(n.attributes.src, no);
      yield ')';
      break;
    }
    case 'fence': {
      yield NL;
      yield indent;
      yield '```';
      yield (n.attributes.language || '').toLowerCase();
      if (n.annotations.length) yield SPACE;
      yield* renderAnnotations(n);
      yield NL;
      yield indent;
      yield* renderChildren(n, no);
      yield indent;
      yield '```';
      yield NL;
      break;
    }
    case 'tag': {
      if (!n.inline) {
        yield NL;
        yield indent;
      }
      yield OPEN + SPACE;
      yield n.tag;
      yield* renderAttributes(n);
      if (n.children.length) {
        yield SPACE + CLOSE;
        yield* renderChildren(n, no.allowIndentation ? increment(no) : no);
        if (!n.inline) {
          yield indent;
        }
        yield OPEN + SPACE + '/';
        yield n.tag;
        yield SPACE + CLOSE;
      }
      // Self-closing
      else {
        yield SPACE + '/' + CLOSE;
      }
      if (!n.inline) {
        yield NL;
      }
      break;
    }
    case 'list': {
      yield NL;
      for (let i = 0; i < n.children.length; i++) {
        yield indent;
        yield n.attributes.ordered ? `1. ` : '- ';
        yield* render(
          n.children[i],
          increment(no, n.attributes.ordered ? `1. `.length : '- '.length)
        );
        // TODO do we need this newline?
        if (!no.indent) yield NL;
      }
      break;
    }
    case 'item': {
      yield trimStart(renderChildren(n, no));
      yield* renderAnnotations(n);
      break;
    }
    case 'strong': {
      yield '**';
      yield* renderChildren(n, no);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* renderChildren(n, no);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* render(n.attributes.content, no);
      yield '`';
      break;
    }
    case 'hardbreak': {
      yield '\\\n';
      yield indent;
      break;
    }
    case 'softbreak': {
      yield NL;
      yield indent;
      break;
    }
    case 'table': {
      const table = [...renderChildren(n, no)] as unknown as string[][];
      if (o.parent && o.parent.type === 'tag' && o.parent.tag === 'table') {
        for (const row of table) {
          yield NL;
          for (const d of row) {
            yield indent + '- ' + d;
            yield NL;
          }
          if (row !== table[table.length - 1]) {
            yield indent + '---';
          }
        }
      } else {
        yield NL;
        const [head, ...rows] = table;

        const ml = table
          .map((arr) => arr.map((s) => s.length).reduce(max))
          .reduce(max);

        yield* renderTableRow(head.map((h) => h + SPACE.repeat(ml - h.length)));
        yield NL;
        yield* renderTableRow(head.map(() => '-'.repeat(ml)));
        yield NL;
        for (const row of rows) {
          yield* renderTableRow(
            row.map((r) => r + SPACE.repeat(ml - r.length))
          );
          yield NL;
        }
      }
      break;
    }
    case 'thead': {
      const [head] = [...renderChildren(n, no)];
      yield head || [];
      break;
    }
    case 'tr': {
      yield [...renderChildren(n, no)];
      break;
    }
    case 'td':
    case 'th': {
      yield [...renderChildren(n, no), ...renderAnnotations(n)].join('');
      break;
    }
    case 'tbody': {
      yield* renderChildren(n, no);
      break;
    }
    // TODO
    case 'error':
    default: {
      throw new Error(`Unimplemented: "${n.type}"`);
    }
  }
}

function* render(
  v: Value,
  o: Options = {}
): Generator<string, boolean, unknown> {
  switch (typeof v) {
    case 'undefined':
      break;
    case 'boolean':
    case 'number':
    case 'string': {
      yield v.toString();
      break;
    }
    case 'object': {
      if (v === null) break;
      if (Array.isArray(v)) {
        for (const n of v) {
          yield* render(n, o);
        }
        break;
      }
      switch (v.$$mdtype) {
        case 'Function': {
          yield* renderFunction(v as Function);
          break;
        }
        case 'Node':
          yield* renderNode(v as Node, o);
          break;
        case 'Variable': {
          yield* renderVariable(v as Variable);
          break;
        }
        default:
          throw new Error(`Unimplemented: "${v.$$mdtype}"`);
      }
      break;
    }
  }
  return true;
}

export default function UNSTABLE_DO_NOT_USE_pretty_render(
  v: Value,
  options?: Options
): string {
  let doc = '';
  for (const s of render(v, options)) doc += s;
  return doc;
}