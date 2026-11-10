import Ast from '../ast';
import { formatMarkdown } from '../formatter';
import Tag from '../tag';
import type {
  MarkdownRenderContext,
  MarkdownRenderHandler,
  MarkdownRenderOptions,
  Node,
  NodeType,
  RenderableTreeNodes,
} from '../types';

type Convert = (tag: Tag, context: MarkdownRenderContext) => Node[];

const INLINE = new Set<NodeType>([
  'text',
  'strong',
  'em',
  's',
  'code',
  'link',
  'image',
  'hardbreak',
  'softbreak',
]);

const BLOCK = new Set<NodeType>([
  'paragraph',
  'heading',
  'blockquote',
  'list',
  'item',
  'fence',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

const node = (
  type: NodeType,
  attributes: Record<string, any> = {},
  children: Node[] = []
) => new Ast.Node(type, attributes, children);

// Literal text of a subtree, used for code where markup has no meaning
function textContent(content: RenderableTreeNodes): string {
  if (typeof content === 'string' || typeof content === 'number')
    return String(content);
  if (Array.isArray(content)) return content.map(textContent).join('');
  if (Tag.isTag(content)) return textContent(content.children ?? []);
  return '';
}

const wrap =
  (type: NodeType, attributes?: (tag: Tag) => Record<string, any>): Convert =>
  (tag, { renderChildren }) => [
    node(type, attributes?.(tag), renderChildren(tag.children ?? [])),
  ];

const list = (ordered: boolean) =>
  wrap('list', ({ attributes }) =>
    ordered ? { ordered, start: attributes?.start } : { ordered }
  );

const builtins: Record<string, Convert> = {
  article: (tag, { renderChildren }) => renderChildren(tag.children ?? []),
  p: wrap('paragraph'),
  strong: wrap('strong'),
  em: wrap('em'),
  s: wrap('s'),
  a: wrap('link', ({ attributes }) => ({
    href: attributes?.href,
    title: attributes?.title,
  })),
  img: ({ attributes }) => [
    node('image', {
      src: attributes?.src,
      alt: attributes?.alt,
      title: attributes?.title,
    }),
  ],
  ul: list(false),
  ol: list(true),
  li: wrap('item'),
  blockquote: wrap('blockquote'),
  hr: () => [node('hr')],
  br: () => [node('hardbreak')],
  code: (tag) => [node('code', { content: textContent(tag.children ?? []) })],
  pre: (tag) => [
    node('fence', {
      content: textContent(tag.children ?? []),
      language: tag.attributes?.['data-language'],
    }),
  ],
  table: wrap('table'),
  thead: wrap('thead'),
  tbody: wrap('tbody'),
  tr: wrap('tr'),
  th: wrap('th', ({ attributes }) => ({ align: attributes?.align })),
  td: wrap('td', ({ attributes }) => ({ align: attributes?.align })),
};

for (let level = 1; level <= 6; level++)
  builtins[`h${level}`] = wrap('heading', () => ({ level }));

function isNode(value: unknown): value is Node {
  return Ast.isAst(value) && value.$$mdtype === 'Node';
}

/**
 * Converts a renderable tree to Markdown AST nodes, without normalization.
 */
function convert(
  content: RenderableTreeNodes,
  handlers: Record<string, MarkdownRenderHandler>
): Node[] {
  const context: MarkdownRenderContext = {
    renderChildren: (children) => convert(children, handlers),
  };

  if (typeof content === 'string' || typeof content === 'number')
    return [node('text', { content: String(content) })];

  if (Array.isArray(content))
    return content.flatMap((child) => convert(child, handlers));

  if (!Tag.isTag(content)) return [];

  const { name } = content;
  const handler = Object.prototype.hasOwnProperty.call(handlers, name)
    ? handlers[name]
    : undefined;

  if (handler === undefined) {
    const builtin = Object.prototype.hasOwnProperty.call(builtins, name)
      ? builtins[name]
      : undefined;
    return builtin
      ? builtin(content, context)
      : context.renderChildren(content.children ?? []);
  }

  if (handler === 'children')
    return context.renderChildren(content.children ?? []);
  if (handler === 'none') return [];
  if (typeof handler !== 'function')
    throw new TypeError(`Invalid Markdown handler for "${name}"`);

  const result = handler(content, context);
  const nodes = Array.isArray(result) ? result : [result];
  for (const n of nodes)
    if (!isNode(n))
      throw new TypeError(
        `Markdown handler for "${name}" must return Markdoc AST nodes`
      );
  return nodes;
}

/*
 * Normalization builds a fresh tree in the shape the formatter expects (for
 * example, inline content wrapped in `inline` nodes) without mutating the
 * converted nodes, which may have been returned by handlers.
 */

function check(n: Node) {
  if (!isNode(n))
    throw new TypeError('Markdown content must be Markdoc AST nodes');
  if (n.type === 'tag')
    throw new Error(
      `Cannot render Markdoc tag "${n.tag}" as Markdown; return Markdown nodes from a handler instead`
    );
  const container = n.type === 'document' || n.type === 'inline';
  if (!container && !INLINE.has(n.type) && !BLOCK.has(n.type))
    throw new Error(`Cannot render a "${n.type}" node as Markdown`);
  if (n.annotations?.length || Object.keys(n.slots ?? {}).length)
    throw new Error('Cannot render Markdoc annotations or slots as Markdown');
  for (const value of Object.values(n.attributes ?? {}))
    if (Ast.isAst(value))
      throw new Error(
        `Cannot render an unresolved ${value.$$mdtype} as Markdown`
      );
}

// Expands transparent containers into their children
function flatten(nodes: Node[]): Node[] {
  return nodes.flatMap((n) => {
    check(n);
    return n.type === 'document' || n.type === 'inline'
      ? flatten(n.children ?? [])
      : [n];
  });
}

const isBreak = (n: Node) => n.type === 'hardbreak' || n.type === 'softbreak';
const isBlank = (n: Node) =>
  isBreak(n) || (n.type === 'text' && !String(n.attributes.content).trim());

function trimBreaks(nodes: Node[]) {
  let start = 0;
  let end = nodes.length;
  while (start < end && isBreak(nodes[start])) start++;
  while (end > start && isBreak(nodes[end - 1])) end--;
  return nodes.slice(start, end);
}

function inlines(nodes: Node[]): Node[] {
  const result: Node[] = [];
  let separate = false;

  for (const n of flatten(nodes)) {
    const content = INLINE.has(n.type) ? [inline(n)] : blockText(n);
    if (!content.length) continue;
    // Keep text from separate blocks apart when flattening them
    if (result.length && (separate || !INLINE.has(n.type)))
      result.push(node('softbreak'));
    result.push(...content);
    separate = !INLINE.has(n.type);
  }

  return result;
}

function inline(n: Node): Node {
  const { attributes = {}, children = [] } = n;
  switch (n.type) {
    case 'text':
      return node('text', { content: String(attributes.content ?? '') });
    case 'code':
      return node('code', { content: String(attributes.content ?? '') });
    case 'link':
      return node('link', { ...attributes }, inlines(children));
    case 'image':
      return node('image', { ...attributes });
    case 'strong':
    case 'em':
    case 's':
      return node(n.type, { ...attributes }, inlines(children));
    default:
      return node(n.type);
  }
}

// Block content placed where only inline content is valid, such as table
// cells, keeps its text but loses its layout
function blockText(n: Node): Node[] {
  switch (n.type) {
    case 'fence': {
      const content = String(n.attributes.content ?? '').replace(/\n$/, '');
      return [node('code', { content })];
    }
    case 'hr':
      return [];
    default:
      return trimBreaks(inlines(n.children ?? []));
  }
}

function blocks(nodes: Node[], loose = true): Node[] {
  const result: Node[] = [];
  let run: Node[] = [];

  const flush = () => {
    const content = trimBreaks(inlines(run));
    run = [];
    if (content.every(isBlank)) return;
    const wrapped = node('inline', {}, content);
    result.push(loose ? node('paragraph', {}, [wrapped]) : wrapped);
  };

  for (const n of flatten(nodes)) {
    if (INLINE.has(n.type)) {
      run.push(n);
      continue;
    }
    flush();
    for (const b of block(n)) {
      // Adjacent lists with the same marker would merge into one list
      const previous = result[result.length - 1];
      if (
        b.type === 'list' &&
        previous?.type === 'list' &&
        !!previous.attributes.ordered === !!b.attributes.ordered
      ) {
        const marker = previous.attributes.marker;
        b.attributes.marker = b.attributes.ordered
          ? marker === ')'
            ? '.'
            : ')'
          : marker === '*'
            ? '-'
            : '*';
      }
      result.push(b);
    }
  }
  flush();

  return result;
}

// Groups consecutive nodes that are not `type` into a single new `type` node
function group(
  nodes: Node[],
  types: NodeType[],
  map: (n: Node) => Node,
  wrap: (run: Node[]) => Node
): Node[] {
  const result: Node[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length && !run.every(isBlank)) result.push(wrap(run));
    run = [];
  };
  for (const n of flatten(nodes)) {
    if (types.includes(n.type)) {
      flush();
      result.push(map(n));
    } else run.push(n);
  }
  flush();
  return result;
}

const cells = (nodes: Node[]) =>
  group(
    nodes,
    ['th', 'td'],
    (cell) =>
      node(
        cell.type,
        { align: cell.attributes.align },
        trimBreaks(inlines(cell.children ?? []))
      ),
    (run) => node('td', {}, trimBreaks(inlines(run)))
  );

const rows = (nodes: Node[]) =>
  group(
    nodes,
    ['tr'],
    (row) => node('tr', {}, cells(row.children ?? [])),
    (run) => node('tr', {}, cells(run))
  );

function table(n: Node): Node {
  const head: Node[] = [];
  const body: Node[] = [];
  for (const child of flatten(n.children ?? [])) {
    if (child.type === 'thead') head.push(...rows(child.children ?? []));
    else if (child.type === 'tbody') body.push(...rows(child.children ?? []));
    else body.push(...rows([child]));
  }
  return node('table', {}, [node('thead', {}, head), node('tbody', {}, body)]);
}

function block(n: Node): Node[] {
  const { attributes = {}, children = [] } = n;
  switch (n.type) {
    case 'paragraph':
      return blocks(children);
    case 'heading': {
      const level = Math.min(Math.max(Number(attributes.level) || 1, 1), 6);
      const content = trimBreaks(inlines(children));
      return [node('heading', { level }, [node('inline', {}, content)])];
    }
    case 'blockquote':
      return [node('blockquote', {}, blocks(children))];
    case 'list': {
      const { ordered, start, marker } = attributes;
      const items = group(
        children,
        ['item'],
        (item) => node('item', {}, blocks(item.children ?? [], false)),
        (run) => node('item', {}, blocks(run, false))
      );
      return [node('list', { ordered: !!ordered, start, marker }, items)];
    }
    case 'fence':
      return [
        node('fence', {
          content: String(attributes.content ?? ''),
          language: attributes.language,
        }),
      ];
    case 'hr':
      return [node('hr')];
    case 'table':
      return [table(n)];
    default:
      // Table parts or list items outside their containers
      return blocks(children);
  }
}

/**
 * Renders a transformed Markdoc tree as Markdown.
 */
export default function render(
  content: RenderableTreeNodes,
  options: MarkdownRenderOptions = {}
): string {
  const nodes = convert(content, options.handlers ?? {});
  return formatMarkdown(node('document', {}, blocks(nodes)));
}
