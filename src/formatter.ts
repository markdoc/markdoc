import Ast from './ast';
import { OPEN, CLOSE, isIdentifier } from './utils';
import type { AttributeValue, Function, Node, Value, Variable } from './types';

type Options = {
  allowIndentation?: boolean;
  maxTagOpeningWidth?: number;
  orderedListMode?: 'increment' | 'repeat';
  parent?: Node;
  indent?: number;
};

const SPACE = ' ';
const SEP = ', '; // Value separator
const NL = '\n'; //  Newline
const OL = '.'; // Ordered list
const UL = '-'; //  Unordered list

const MAX_TAG_OPENING_WIDTH = 80;

const WRAPPING_TYPES = ['strong', 'em', 's'];

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

function* formatInline(g: Generator<string>) {
  yield [...g].join('').trim();
}

function* formatTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |`;
}

function formatScalar(v: Value): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  if (Ast.isAst(v)) {
    return format(v);
  }
  if (v === null) {
    return 'null';
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

function formatAnnotationValue(a: AttributeValue): string | undefined {
  const formattedValue = formatScalar(a.value);

  if (formattedValue === undefined) return undefined;
  if (a.name === 'primary') return formattedValue;
  if (a.name === 'id' && typeof a.value === 'string' && isIdentifier(a.value))
    return '#' + a.value;
  if (a.type === 'class' && isIdentifier(a.name)) return '.' + a.name;

  return `${a.name}=${formattedValue}`;
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
      if (isIdentifier(p)) return '.' + p;
      if (typeof p === 'number') return `[${p}]`;
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

function* escapeMarkdownCharacters(s: string, characters: RegExp) {
  yield s
    .replace(characters, '\\$&')
    // TODO keep &nbsp; as entity in the AST?
    // Non-breaking space (0xA0)
    .replace(new RegExp('\xa0', 'g'), '&nbsp;');
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
      yield* typeof n.attributes.src === 'string'
        ? escapeMarkdownCharacters(n.attributes.src, /[()]/g)
        : formatValue(n.attributes.src, no);
      if (n.attributes.title) {
        yield SPACE + `"${n.attributes.title}"`;
      }
      yield ')';
      break;
    }
    case 'link': {
      const children = [...formatChildren(n, no)].join('');

      // https://spec.commonmark.org/0.31.2/#autolinks
      if (children === n.attributes.href && !n.attributes.title) {
        yield `<${n.attributes.href}>`;
        break;
      }

      yield '[';
      yield children;
      yield ']';
      yield '(';
      yield* typeof n.attributes.href === 'string'
        ? escapeMarkdownCharacters(n.attributes.href, /[()]/g)
        : formatValue(n.attributes.href, no);
      if (n.attributes.title) {
        yield SPACE + `"${n.attributes.title}"`;
      }
      yield ')';
      break;
    }
    case 'text': {
      const { content } = n.attributes;

      if (Ast.isAst(content)) {
        yield OPEN + SPACE;
        yield* formatValue(content, no);
        yield SPACE + CLOSE;
      } else {
        if (o.parent && WRAPPING_TYPES.includes(o.parent.type)) {
          // Escape **strong**, _em_, and ~~s~~
          yield* escapeMarkdownCharacters(content, /[*_~]/g);
        } else {
          // Escape > blockquote, * list item, and heading
          yield* escapeMarkdownCharacters(content, /^[*>#]/);
        }
      }

      break;
    }
    case 'blockquote': {
      const prefix = '>' + SPACE;
      yield n.children
        .map((child) => format(child, no).trimStart())
        .map((d) => NL + indent + prefix + d)
        .join(indent + prefix);
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

      const innerFence = n.attributes.content.match(/`{3,}/g) || [];

      const innerFenceLength = innerFence
        .map((s: string) => s.length)
        .reduce(max, 0);

      const boundary = '`'.repeat(innerFenceLength ? innerFenceLength + 1 : 3);
      const needsNlBeforeEndBoundary = !n.attributes.content.endsWith(NL);

      yield boundary;
      if (n.attributes.language) yield n.attributes.language;
      if (n.annotations.length) yield SPACE;
      yield* formatAnnotations(n);
      yield NL;
      yield indent;
      yield n.attributes.content.split(NL).join(NL + indent); // yield* formatChildren(n, no);
      if (needsNlBeforeEndBoundary) {
        yield NL;
      }
      yield boundary;
      yield NL;
      break;
    }
    case 'tag': {
      if (!n.inline) {
        yield NL;
        yield indent;
      }
      const open = OPEN + SPACE;
      const attributes = [...formatAttributes(n)].filter(
        (v) => v !== undefined
      );
      const tag = [open + n.tag, ...attributes];
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
      const isLoose = n.children.some((n) =>
        n.children.some((c) => c.type === 'paragraph')
      );

      for (let i = 0; i < n.children.length; i++) {
        const prefix = (() => {
          if (!n.attributes.ordered) return n.attributes.marker ?? UL;

          // Must be an ordered list now
          let number = '1';
          const startNumber = n.attributes.start ?? 1;
          if (i === 0) number = startNumber.toString();

          if (o.orderedListMode === 'increment') {
            number = (parseInt(startNumber) + i).toString();
          }

          return `${number}${n.attributes.marker ?? OL}`;
        })();
        let d = format(n.children[i], increment(no, prefix.length + 1));

        if (!isLoose || i === n.children.length - 1) {
          d = d.trim();
        }

        yield NL + indent + prefix + ' ' + d;
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
      yield n.attributes.marker ?? '**';
      yield* formatInline(formatChildren(n, no));
      yield n.attributes.marker ?? '**';
      break;
    }
    case 'em': {
      yield n.attributes.marker ?? '*';
      yield* formatInline(formatChildren(n, no));
      yield n.attributes.marker ?? '*';
      break;
    }
    case 'code': {
      yield '`';
      yield* formatInline(formatValue(n.attributes.content, no));
      yield '`';
      break;
    }
    case 's': {
      yield '~~';
      yield* formatInline(formatChildren(n, no));
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
              yield NL + indent + UL + ' ' + d;
            }
          }
        }
        yield NL;
      } else {
        const widths: number[] = [];

        for (const row of table) {
          for (let i = 0; i < row.length; i++) {
            widths[i] = widths[i]
              ? Math.max(widths[i], row[i].length)
              : row[i].length;
          }
        }

        const [head, ...rows] = table as string[][];

        yield NL;
        yield* formatTableRow(
          head.map((cell, i) => cell + SPACE.repeat(widths[i] - cell.length))
        );
        yield NL;
        yield* formatTableRow(head.map((cell, i) => '-'.repeat(widths[i])));
        yield NL;
        for (const row of rows) {
          yield* formatTableRow(
            row.map((cell, i) => cell + SPACE.repeat(widths[i] - cell.length))
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
  v: Value | Value[],
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

export default function format(v: Value | Value[], options?: Options): string {
  let doc = '';
  for (const s of formatValue(v, options)) doc += s;
  return doc.trimStart();
}
