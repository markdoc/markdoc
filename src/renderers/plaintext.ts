import type { Function, Node, NodeType, Value } from '../types';
import type Variable from '../ast/variable';

type Options = {
  parentContext?: Node;
  indent?: number;
  itemIndex?: number;
};

const SPACE = ' ';

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
  switch (n.type as NodeType) {
    case 'document': {
      if (n.attributes.frontmatter && n.attributes.frontmatter.length) {
        yield `---\n${n.attributes.frontmatter}\n---\n`;
      }
      yield* renderChildren(n, o);
      break;
    }
    case 'heading': {
      yield '\n';
      yield '#'.repeat(n.attributes.level || 1);
      yield SPACE;
      yield* renderChildren(n, o);
      yield* renderAnnotations(n);
      yield '\n';
      break;
    }
    case 'paragraph': {
      // Remove new line at the start of a loose list
      if (!(o?.parentContext?.type === 'item' && o.itemIndex === 0)) yield '\n';
      yield* renderChildren(n, o);
      yield '\n';
      break;
    }
    case 'inline': {
      yield* renderChildren(n, o);
      break;
    }
    case 'link': {
      yield '[';
      yield* render(n.attributes.href, o);
      yield ']';
      yield '(';
      yield* renderChildren(n, o);
      yield ')';
      break;
    }
    case 'text': {
      // Indent text when nested in a loose list
      if (o.itemIndex) yield SPACE.repeat(2 * (o.indent || 0));
      yield* render(n.attributes.content, o);
      break;
    }
    case 'blockquote': {
      yield '\n';
      yield '> ';
      yield* renderChildren(n.children[0], o);
      yield '\n';
      break;
    }
    case 'hr': {
      yield '\n---\n';
      break;
    }
    case 'image': {
      yield '!';
      yield '[';
      yield* render(n.attributes.alt, o);
      yield ']';
      yield '(';
      yield* render(n.attributes.src, o);
      yield ')';
      break;
    }
    case 'fence': {
      yield '\n';
      yield '```';
      yield (n.attributes.language || '').toLowerCase();
      if (n.annotations.length) yield SPACE;
      yield* renderAnnotations(n);
      yield '\n';
      yield* renderChildren(n, o);
      yield '```';
      yield '\n';
      break;
    }
    case 'tag': {
      yield '\n';
      yield '{% ';
      yield n.tag;
      yield Object.entries(n.attributes)
        .map(([key, value]) => ` ${key}=${JSON.stringify(value)}`)
        .join('');
      yield ' %}';
      yield '\n';
      yield* renderChildren(n, { parentContext: n });
      yield '\n';
      yield '{% /';
      yield n.tag;
      yield ' %}';
      yield '\n';
      break;
    }
    case 'list': {
      yield '\n';
      for (let i = 0; i < n.children.length; i++) {
        yield '  '.repeat(o.indent || 0);
        yield n.attributes.ordered ? `${i + 1}. ` : '- ';
        yield* render(n.children[i], o);
        // TODO do we need this newline?
        if (!o.indent) yield '\n';
      }
      break;
    }
    case 'item': {
      for (let i = 0; i < n.children.length; i++) {
        yield* render(n.children[i], {
          parentContext: n,
          indent: (o.indent || 0) + 1,
          itemIndex: i,
        });
      }
      break;
    }
    case 'strong': {
      yield '**';
      yield* renderChildren(n, o);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* renderChildren(n, o);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* render(n.attributes.content, o);
      yield '`';
      break;
    }
    case 'hardbreak': {
      yield '\\\n';
      break;
    }
    case 'softbreak': {
      yield '\n';
      break;
    }
    case 'table': {
      const table = [...renderChildren(n, o)] as unknown as string[][];
      if (
        o.parentContext &&
        o.parentContext.type === 'tag' &&
        o.parentContext.tag === 'table'
      ) {
        yield table
          .map((a: any) => a.map((i: string) => `* ` + i).join('\n'))
          .join(`${table[0].length ? '\n' : ''}---\n`);
      } else {
        yield '\n';
        const [head, ...rows] = table;

        const ml = table
          .map((arr) => arr.map((s) => s.length).reduce(max))
          .reduce(max);

        yield* renderTableRow(head.map((h) => h + SPACE.repeat(ml - h.length)));
        yield '\n';
        yield* renderTableRow(head.map(() => '-'.repeat(ml)));
        yield '\n';
        for (const row of rows) {
          yield* renderTableRow(
            row.map((r) => r + SPACE.repeat(ml - r.length))
          );
          yield '\n';
        }
      }
      break;
    }
    case 'thead': {
      const [head] = [...renderChildren(n, o)];
      yield head || [];
      break;
    }
    case 'tr': {
      yield [...renderChildren(n, o)];
      break;
    }
    case 'tbody':
    case 'td':
    case 'th': {
      yield* renderChildren(n, o);
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
