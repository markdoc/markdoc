import type { AstType, Function, Node } from '../types';
import type Variable from '../ast/variable';

const maxLength = (a: number, b: number) => Math.max(a, b);

function* renderChildren(a: Node) {
  for (const child of a.children) {
    yield* render(child);
  }
}

function* renderTableRow(items: Array<string>) {
  yield `| ${items.join(' | ')} |\n`;
}

function* renderVariable(a: Variable) {
  yield '{% ';
  yield '$';
  yield a.path.join('.');
  yield ' %}';
}

function* renderFunction(a: Function) {
  yield '{% ';
  yield '';
  yield a.name;
  yield '(';
  yield Object.values(a.parameters)
    .map((value) => JSON.stringify(value))
    .join(', ');
  yield ')';
  yield ' %}';
}

function* renderNode(a: Node) {
  switch (a.type) {
    case 'document': {
      if (a.attributes.frontmatter.length) {
        yield `---\n${a.attributes.frontmatter}\n---\n`;
        yield* renderChildren(a);
      }
      break;
    }
    case 'heading': {
      yield '\n';
      yield '#'.repeat(a.attributes.level || 1);
      yield ' ';
      yield* renderChildren(a);
      yield '\n';
      // TODO look at annotations here
      break;
    }
    case 'paragraph': {
      yield '\n';
      yield* renderChildren(a);
      yield '\n';
      break;
    }
    case 'inline': {
      yield* renderChildren(a);
      break;
    }
    case 'link': {
      yield '[';
      yield* render(a.attributes.href);
      yield ']';
      yield '(';
      yield* renderChildren(a);
      yield ')';
      break;
    }
    case 'text': {
      yield* render(a.attributes.content);
      break;
    }
    case 'blockquote': {
      yield '\n';
      yield '> ';
      yield* renderChildren(a.children[0]);
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
      yield* render(a.attributes.alt);
      yield ']';
      yield '(';
      yield* render(a.attributes.src);
      yield ')';
      break;
    }
    case 'fence': {
      yield '\n';
      yield '```';
      yield (a.attributes.language || '').toLowerCase();
      yield '\n';
      yield* renderChildren(a);
      yield '```';
      yield '\n';
      break;
    }
    case 'tag': {
      yield '\n';
      yield '{% ';
      yield a.tag;
      yield ' ';
      yield Object.entries(a.attributes)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      yield ' %}';
      yield '\n';
      yield* renderChildren(a);
      yield '\n';
      yield '{% /';
      yield a.tag;
      yield ' %}';
      yield '\n';
      break;
    }
    case 'list': {
      yield '\n';
      yield* renderChildren(a);
      break;
    }
    case 'item': {
      yield '- ';
      yield* renderChildren(a);
      yield '\n';
      break;
    }
    case 'strong': {
      yield '**';
      yield* renderChildren(a);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* renderChildren(a);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* render(a.attributes.content);
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
      const table = [...renderChildren(a)] as unknown as string[][];
      const [head, ...rows] = table;

      const max = table
        .map((arr) => arr.map((s) => s.length).reduce(maxLength))
        .reduce(maxLength);

      yield* renderTableRow(head.map((h) => h + ' '.repeat(max - h.length)));
      yield* renderTableRow(head.map(() => '-'.repeat(max)));
      for (const row of rows) {
        yield* renderTableRow(row.map((r) => r + ' '.repeat(max - r.length)));
      }
      break;
    }
    case 'thead': {
      const [head] = [...renderChildren(a)];
      yield head;
      break;
    }
    case 'tr': {
      yield [...renderChildren(a)];
      break;
    }
    case 'tbody':
    case 'td':
    case 'th': {
      yield* renderChildren(a);
      break;
    }
    default: {
      throw new Error(`Unimplemented: "${a.type}"`);
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
