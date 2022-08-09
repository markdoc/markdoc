import type { Function, Node, NodeType, Value } from '../types';
import type Variable from '../ast/variable';

type Options = {
  parent?: Node;
  indent?: number;
  itemIndex?: number;
};

const SPACE = ' ';
const NL = '\n';

const max = (a: number, b: number) => Math.max(a, b);

function* renderChildren(a: Node, options: Options) {
  for (const child of a.children) {
    yield* render(child, options);
  }
}

function* renderTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |`;
}

function* renderAnnotations(n: Node) {
  if (n.annotations.length) {
    yield '{% ';
    yield n.annotations
      .map((a) => {
        if (a.type === 'class') {
          return '.' + a.name;
        }
        if (a.name === 'id') {
          return '#' + a.value;
        }
        return `${a.name}=${JSON.stringify(a.value)}`;
      })
      .join(SPACE);
    yield ' %}';
  }
}

function* renderVariable(v: Variable) {
  yield '{% ';
  yield '$';
  yield v.path.join('.');
  yield ' %}';
}

function* renderFunction(f: Function) {
  yield '{% ';
  yield '';
  yield f.name;
  yield '(';
  yield Object.values(f.parameters)
    .map((value) => JSON.stringify(value))
    .join(', ');
  yield ')';
  yield ' %}';
}

function* renderNode(n: Node, o: Options = {}) {
  const no = { ...o, parent: n };
  const indent = SPACE.repeat(2 * (no.indent || 0));

  switch (n.type as NodeType) {
    case 'document': {
      if (n.attributes.frontmatter && n.attributes.frontmatter.length) {
        yield `---\n${n.attributes.frontmatter}\n---\n`;
      }
      yield* renderChildren(n, no);
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
      const tagChild = o?.parent?.type === 'tag';
      const nested =
        (o?.parent?.type === 'item' && o.itemIndex === 0) || tagChild;

      if (!nested) {
        yield NL;
        yield indent;
      }
      yield* renderChildren(n, no);
      if (!tagChild) yield NL;
      break;
    }
    case 'inline': {
      yield* renderChildren(n, no);
      break;
    }
    case 'link': {
      yield '[';
      yield* render(n.attributes.href, no);
      yield ']';
      yield '(';
      yield* renderChildren(n, no);
      yield ')';
      break;
    }
    case 'text': {
      yield* render(n.attributes.content, no);
      break;
    }
    case 'blockquote': {
      yield NL;
      yield '> ';
      yield* renderChildren(n.children[0], no);
      yield NL;
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
      yield NL;
      yield indent;
      yield '{% ';
      yield n.tag;
      yield Object.entries(n.attributes)
        .map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
        .join('');
      yield ' %}';
      yield NL;
      yield indent;
      yield* renderChildren(n, no);
      yield NL;
      yield indent;
      yield '{% /';
      yield n.tag;
      yield ' %}';
      yield NL;
      break;
    }
    case 'list': {
      yield NL;
      for (let i = 0; i < n.children.length; i++) {
        yield indent;
        yield n.attributes.ordered ? `${i + 1}. ` : '- ';
        yield* render(n.children[i], {
          ...no,
          indent: (no.indent || 0) + 1,
        });
        // TODO do we need this newline?
        if (!indent) yield NL;
      }
      break;
    }
    case 'item': {
      for (let i = 0; i < n.children.length; i++) {
        yield* render(n.children[i], {
          ...no,
          itemIndex: i,
        });
      }
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
        yield table
          .map((a: any) => a.map((i: string) => `* ` + i).join(NL))
          .join(`${table[0].length ? NL : ''}---\n`);
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
    case 'tbody':
    case 'td':
    case 'th': {
      yield* renderChildren(n, no);
      break;
    }
    default: {
      throw new Error(`Unimplemented: "${n.type}"`);
    }
  }
}

export function* render(
  a: Value,
  o: Options = {}
): Generator<string, void, unknown> {
  switch (typeof a) {
    case 'boolean':
    case 'number':
    case 'string': {
      yield a.toString();
      break;
    }
    case 'object': {
      if (a === null) break;
      if (Array.isArray(a)) {
        for (const n of a) {
          yield* render(n, o);
        }
        break;
      }
      switch (a.$$mdtype) {
        case 'Function': {
          yield* renderFunction(a as Function);
          break;
        }
        case 'Node':
          yield* renderNode(a as Node, o);
          break;
        case 'Variable': {
          yield* renderVariable(a as Variable);
          break;
        }
        default:
          throw new Error(`Unimplemented: "${a.$$mdtype}"`);
      }
      break;
    }
  }
}

// TODO naming
export default function print(a: Value): string {
  return [...render(a)].join('');
}
