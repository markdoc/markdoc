import Node from './ast/node';
import transforms from './transforms/index';

import type { AttributeValue } from './types';

import type Token from 'markdown-it/lib/token';

const mappings: Record<string, string> = {
  ordered_list: 'list',
  bullet_list: 'list',
  code_inline: 'code',
  list_item: 'item',
  variable: 'text',
};

function annotate(node: Node, attributes: AttributeValue[]) {
  for (const { name, value, type } of attributes)
    if (type === 'attribute') node.attributes[name] = value;
    else if (type === 'class')
      if (node.attributes.class) node.attributes.class[name] = value;
      else node.attributes.class = { [name]: value };
}

function handleAttrs(token: Token, type: string) {
  switch (type) {
    case 'heading':
      return { level: Number(token.tag.replace('h', '')) };
    case 'list':
      return { ordered: token.type.startsWith('ordered') };
    case 'link': {
      const attrs = Object.fromEntries(token.attrs);
      return attrs?.title ? { href: attrs.href, title: attrs.title } : { href: attrs.href };
    }
    case 'image': {
      const attrs = Object.fromEntries(token.attrs);
      return { alt: token.content, src: attrs.src };
    }
    case 'text':
    case 'code':
      return { content: (token.meta || {}).variable || token.content };
    case 'fence': {
      const [language] = token.info.split(' ', 1);
      return language === ''
        ? { content: token.content }
        : { content: token.content, language };
    }
    default:
      return {};
  }
}

function handleToken(
  token: Token,
  nodes: Node[],
  file?: string,
  inlineParent?: Node
) {
  if (token.type === 'frontmatter') {
    nodes[0].attributes.frontmatter = token.content;
    return;
  }

  if (token.hidden || (token.type === 'text' && token.content === '')) return;

  const errors = token.errors || [];
  const parent = nodes[nodes.length - 1];
  const { tag, attributes, error } = token.meta || {};

  if (token.type === 'annotation') {
    if (inlineParent) return annotate(inlineParent, attributes);

    return parent.errors.push({
      id: 'no-inline-annotations',
      level: 'error',
      message: `Can't apply inline annotations to '${parent.type}'`,
    });
  }

  let typeName = token.type.replace(/_(open|close)$/, '');
  if (mappings[typeName]) typeName = mappings[typeName];

  if (typeName === 'error') {
    const { message, location } = error;
    errors.push({ id: 'parse-error', level: 'critical', message, location });
  }

  if (token.nesting < 0) {
    if (parent.type === typeName) {
      if (parent.lines && token.map) parent.lines.push(...token.map);
      return nodes.pop();
    }

    errors.push({
      id: 'missing-opening',
      level: 'critical',
      message: `Node '${typeName}' is missing opening`,
    });
  }

  const attrs = handleAttrs(token, typeName);
  const node = new Node(typeName, attrs, undefined, tag || undefined);
  const { position = {} } = token;

  node.errors = errors;
  node.lines = token.map || parent.lines || [];
  node.location = {
    file,
    start: {
      line: node.lines[0],
      character: position.start,
    },
    end: {
      line: node.lines[1],
      character: position.end,
    },
  };

  if (inlineParent) node.inline = true;

  if (attributes && ['tag', 'fence', 'image'].includes(typeName))
    annotate(node, attributes);

  parent.push(node);
  if (token.nesting > 0) nodes.push(node);

  if (!Array.isArray(token.children)) return;

  inlineParent = parent;

  nodes.push(node);

  const isLeafNode = typeName === 'image';
  if (!isLeafNode) {
    for (const child of token.children)
      handleToken(child, nodes, file, inlineParent);
  }

  nodes.pop();
}

export default function parser(tokens: Token[], file?: string) {
  const doc = new Node('document');
  const nodes = [doc];

  for (const token of tokens) handleToken(token, nodes, file);

  if (nodes.length > 1)
    for (const node of nodes.slice(1))
      node.errors.push({
        id: 'missing-closing',
        level: 'critical',
        message: `Node '${node.tag || node.type}' is missing closing`,
      });

  for (const transform of transforms) transform(doc);

  return doc;
}
