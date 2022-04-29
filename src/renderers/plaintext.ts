import type { AstType, Function, Node, NodeType } from '../types';
import type Variable from '../ast/variable';

const max = (a: number, b: number) => Math.max(a, b);

function* renderChildren(a: Node) {
  for (const child of a.children) {
    yield* render(child);
  }
}

function* renderTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |\n`;
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

function* renderNode(n: Node) {
  switch (n.type as NodeType) {
    case 'document': {
      if (n.attributes.frontmatter.length) {
        yield `---\n${n.attributes.frontmatter}\n---\n`;
      }
      yield* renderChildren(n);
      break;
    }
    case 'heading': {
      yield '\n';
      yield '#'.repeat(n.attributes.level || 1);
      yield ' ';
      yield* renderChildren(n);
      yield '\n';
      // TODO look at annotations here
      break;
    }
    case 'paragraph': {
      yield '\n';
      yield* renderChildren(n);
      yield '\n';
      break;
    }
    case 'inline': {
      yield* renderChildren(n);
      break;
    }
    case 'link': {
      yield '[';
      yield* render(n.attributes.href);
      yield ']';
      yield '(';
      yield* renderChildren(n);
      yield ')';
      break;
    }
    case 'text': {
      yield* render(n.attributes.content);
      break;
    }
    case 'blockquote': {
      yield '\n';
      yield '> ';
      yield* renderChildren(n.children[0]);
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
      yield* render(n.attributes.alt);
      yield ']';
      yield '(';
      yield* render(n.attributes.src);
      yield ')';
      break;
    }
    case 'fence': {
      yield '\n';
      yield '```';
      yield (n.attributes.language || '').toLowerCase();
      yield '\n';
      yield* renderChildren(n);
      yield '```';
      yield '\n';
      break;
    }
    case 'tag': {
      yield '\n';
      yield '{% ';
      yield n.tag;
      yield ' ';
      yield Object.entries(n.attributes)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      yield ' %}';
      yield '\n';
      yield* renderChildren(n);
      yield '\n';
      yield '{% /';
      yield n.tag;
      yield ' %}';
      yield '\n';
      break;
    }
    case 'list': {
      yield '\n';
      for (const item of n.children) {
        yield n.attributes.ordered ? '1. ' : '- ';
        yield* render(item);
        yield '\n';
      }
      break;
    }
    case 'item': {
      // TODO avoid this join
      yield* renderChildren(n);
      break;
    }
    case 'strong': {
      yield '**';
      yield* renderChildren(n);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* renderChildren(n);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* render(n.attributes.content);
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
      yield '\n';
      const table = [...renderChildren(n)] as unknown as string[][];
      const [head, ...rows] = table;

      const ml = table
        .map((arr) => arr.map((s) => s.length).reduce(max))
        .reduce(max);

      yield* renderTableRow(head.map((h) => h + ' '.repeat(ml - h.length)));
      yield* renderTableRow(head.map(() => '-'.repeat(ml)));
      for (const row of rows) {
        yield* renderTableRow(row.map((r) => r + ' '.repeat(ml - r.length)));
      }
      break;
    }
    case 'thead': {
      const [head] = [...renderChildren(n)];
      yield head;
      break;
    }
    case 'tr': {
      yield [...renderChildren(n)];
      break;
    }
    case 'tbody':
    case 'td':
    case 'th': {
      yield* renderChildren(n);
      break;
    }
    default: {
      throw new Error(`Unimplemented: "${n.type}"`);
    }
  }
}

export function* render(
  a: AstType | string | boolean | number
): Generator<string, void, unknown> {
  switch (typeof a) {
    case 'boolean':
    case 'number':
    case 'string': {
      yield a.toString();
      break;
    }
    case 'object': {
      switch (a.$$mdtype) {
        case 'Function': {
          yield* renderFunction(a as Function);
          break;
        }
        case 'Node':
          yield* renderNode(a as Node);
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

export default function TODO(a: AstType | string | boolean | number) {
  return [...render(a)].join('');
}
