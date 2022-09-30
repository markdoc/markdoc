import Ast from './ast';
import { OPEN, CLOSE, isIdentifier } from './utils';
import type { AttributeValue, Function, Node, Value, Variable } from './types';

type Options = {
  allowIndentation?: boolean;
  maxTagOpeningWidth?: number;
  parent?: Node;
  indent?: number;
};

const SPACE = ' ';
const SEP = ', '; // Value separator
const NL = '\n'; //  Newline
const OL = '1. '; // Ordered list
const UL = '- '; //  Unordered list

const MAX_TAG_OPENING_WIDTH = 80;

const max = (a: number, b: number) => Math.max(a, b);
const increment = (o: Options, n = 2) => ({
  ...o,
  indent: (o.indent || 0) + n,
});

function* formatChildren(a: Node, options: Options) {
  for (const child of a.children) {
    yield* formatValue(child, options);
  }
}

function* formatTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |`;
}

function formatScalar(v: Value): string {
  if (Ast.isAst(v)) {
    return format(v);
  }
  if (v === null) {
    return '';
  }
  if (Array.isArray(v)) {
    return '[' + v.map(formatScalar).join(SEP) + ']';
  }
  if (typeof v === 'object') {
    return (
      '{' +
      Object.entries(v)
        .map(
          ([key, value]) =>
            `${isIdentifier(key) ? key : `"${key}"`}: ${formatScalar(value)}`
        )
        .join(SEP) +
      '}'
    );
  }
  return JSON.stringify(v);
}

function formatAnnotationValue(a: AttributeValue): string {
  if (a.name === 'primary') return formatScalar(a.value);
  if (a.name === 'id' && typeof a.value === 'string' && isIdentifier(a.value))
    return '#' + a.value;
  if (a.type === 'class' && isIdentifier(a.name)) return '.' + a.name;
  return `${a.name}=${formatScalar(a.value)}`;
}

function* formatAttributes(n: Node) {
  for (const [key, value] of Object.entries(n.attributes)) {
    /**
     * In cases where the class attribute is not a valid identifer, we treat it as a
     * regular attribute without the '.' sigil
     */
    if (key === 'class' && typeof value === 'object' && !Ast.isAst(value))
      for (const name of Object.keys(value)) {
        yield formatAnnotationValue({ type: 'class', name, value });
      }
    else yield formatAnnotationValue({ type: 'attribute', name: key, value });
  }
}

function* formatAnnotations(n: Node) {
  if (n.annotations.length) {
    yield OPEN + SPACE;
    yield n.annotations.map(formatAnnotationValue).join(SPACE);
    yield SPACE + CLOSE;
  }
}

function* formatVariable(v: Variable) {
  yield '$';
  yield v.path
    .map((p, i) => {
      if (i === 0) return p;
      if (isIdentifier(String(p))) return '.' + p;
      return `["${p}"]`;
    })
    .join('');
}

function* formatFunction(f: Function) {
  yield f.name;
  yield '(';
  yield Object.values(f.parameters).map(formatScalar).join(SEP);
  yield ')';
}

function* trimStart(g: Generator<string>) {
  let n;
  do {
    const { value, done } = g.next();
    if (done) return;
    n = value.trimStart();
  } while (!n.length);
  yield n;
  yield* g;
}

function* formatNode(n: Node, o: Options = {}) {
  const no = { ...o, parent: n };
  const indent = SPACE.repeat(no.indent || 0);

  switch (n.type) {
    case 'document': {
      if (n.attributes.frontmatter && n.attributes.frontmatter.length) {
        yield '---' + NL + n.attributes.frontmatter + NL + '---' + NL + NL;
      }
      yield* trimStart(formatChildren(n, no));
      break;
    }
    case 'heading': {
      yield NL;
      yield indent;
      yield '#'.repeat(n.attributes.level || 1);
      yield SPACE;
      yield* trimStart(formatChildren(n, no));
      yield* formatAnnotations(n);
      yield NL;
      break;
    }
    case 'paragraph': {
      yield NL;
      yield* formatChildren(n, no);
      yield* formatAnnotations(n);
      yield NL;
      break;
    }
    case 'inline': {
      yield indent;
      yield* formatChildren(n, no);
      break;
    }
    case 'image': {
      yield '!';
      yield '[';
      yield* formatValue(n.attributes.alt, no);
      yield ']';
      yield '(';
      yield* formatValue(n.attributes.src, no);
      if (n.attributes.title) {
        yield SPACE + `"${n.attributes.title}"`;
      }
      yield ')';
      break;
    }
    case 'link': {
      yield '[';
      yield* formatChildren(n, no);
      yield ']';
      yield '(';
      yield* formatValue(n.attributes.href, no);
      if (n.attributes.title) {
        yield SPACE + `"${n.attributes.title}"`;
      }
      yield ')';
      break;
    }
    case 'text': {
      if (Ast.isAst(n.attributes.content)) yield OPEN + SPACE;
      yield* formatValue(n.attributes.content, no);
      if (Ast.isAst(n.attributes.content)) yield SPACE + CLOSE;
      break;
    }
    case 'blockquote': {
      yield NL;
      yield indent;
      yield '> ';
      yield* trimStart(formatChildren(n, no));
      break;
    }
    case 'hr': {
      yield NL;
      yield indent;
      yield '---';
      yield NL;
      break;
    }
    case 'fence': {
      yield NL;
      yield indent;
      yield '```';
      if (n.attributes.language) yield n.attributes.language;
      if (n.annotations.length) yield SPACE;
      yield* formatAnnotations(n);
      yield NL;
      yield indent;
      // TODO use formatChildren once we can differentiate inline from block tags within fences
      yield n.attributes.content.split(NL).join(NL + indent); // yield* formatChildren(n, no);
      yield '```';
      yield NL;
      break;
    }
    case 'tag': {
      if (!n.inline) {
        yield NL;
        yield indent;
      }
      const open = OPEN + SPACE;
      const tag = [open + n.tag, ...formatAttributes(n)];
      const inlineTag = tag.join(SPACE);

      const isLongTagOpening =
        inlineTag.length + open.length * 2 >
        (o.maxTagOpeningWidth || MAX_TAG_OPENING_WIDTH);

      // {% tag attributes={...} %}
      yield (!n.inline && isLongTagOpening
        ? tag.join(NL + SPACE.repeat(open.length) + indent)
        : inlineTag) +
        SPACE +
        (n.children.length ? '' : '/') +
        CLOSE;

      if (n.children.length) {
        yield* formatChildren(n, no.allowIndentation ? increment(no) : no);
        if (!n.inline) {
          yield indent;
        }
        // {% /tag %}
        yield OPEN + SPACE + '/' + n.tag + SPACE + CLOSE;
      }
      if (!n.inline) {
        yield NL;
      }
      break;
    }
    case 'list': {
      const prefix = n.attributes.ordered ? OL : UL;
      for (const child of n.children) {
        const d = format(child, increment(no, prefix.length)).trim();
        yield NL + indent + prefix + d;
      }
      yield NL;
      break;
    }
    case 'item': {
      for (let i = 0; i < n.children.length; i++) {
        yield* formatValue(n.children[i], no);
        if (i === 0) yield* formatAnnotations(n);
      }
      break;
    }
    case 'strong': {
      yield '**';
      yield* formatChildren(n, no);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* formatChildren(n, no);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* formatValue(n.attributes.content, no);
      yield '`';
      break;
    }
    case 's': {
      yield '~~';
      yield* formatChildren(n, no);
      yield '~~';
      break;
    }
    case 'hardbreak': {
      yield '\\' + NL;
      yield indent;
      break;
    }
    case 'softbreak': {
      yield NL;
      yield indent;
      break;
    }
    case 'table': {
      const table = [...formatChildren(n, increment(no))] as any as any[];
      if (o.parent && o.parent.type === 'tag' && o.parent.tag === 'table') {
        for (let i = 0; i < table.length; i++) {
          const row = table[i];
          // format tags like "if" in the middle of a table list
          if (typeof row === 'string') {
            if (row.trim().length) {
              yield NL;
              yield row;
            }
          } else {
            if (i !== 0) {
              yield NL;
              yield indent + '---';
            }
            for (const d of row) {
              yield NL + indent + UL + d;
            }
          }
        }
        yield NL;
      } else {
        yield NL;
        const [head, ...rows] = table as string[][];

        const ml = table
          .map((arr) => arr.map((s: string) => s.length).reduce(max))
          .reduce(max);

        yield* formatTableRow(head.map((h) => h + SPACE.repeat(ml - h.length)));
        yield NL;
        yield* formatTableRow(head.map(() => '-'.repeat(ml)));
        yield NL;
        for (const row of rows) {
          yield* formatTableRow(
            row.map((r) => r + SPACE.repeat(ml - r.length))
          );
          yield NL;
        }
      }
      break;
    }
    case 'thead': {
      const [head] = [...formatChildren(n, no)];
      yield head || [];
      break;
    }
    case 'tr': {
      yield [...formatChildren(n, no)];
      break;
    }
    case 'td':
    case 'th': {
      yield [...formatChildren(n, no), ...formatAnnotations(n)].join('').trim();
      break;
    }
    case 'tbody': {
      yield* formatChildren(n, no);
      break;
    }
    case 'comment': {
      yield '<!-- ' + n.attributes.content + ' -->\n';
      break;
    }
    case 'error':
    case 'node':
      break;
  }
}

function* formatValue(
  v: Value,
  o: Options = {}
): Generator<string, void, unknown> {
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
        for (const n of v) yield* formatValue(n, o);
        break;
      }
      switch (v.$$mdtype) {
        case 'Function': {
          yield* formatFunction(v as Function);
          break;
        }
        case 'Node':
          yield* formatNode(v as Node, o);
          break;
        case 'Variable': {
          yield* formatVariable(v as Variable);
          break;
        }
        default:
          throw new Error(`Unimplemented: "${v.$$mdtype}"`);
      }
      break;
    }
  }
}

export default function format(v: Value, options?: Options): string {
  let doc = '';
  for (const s of formatValue(v, options)) doc += s;
  return doc.trimStart();
}
