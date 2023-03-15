import MarkdownIt from 'markdown-it';
import Tag from '../tag';
import UnsafeRaw from '../raw';
import type { RenderableTreeNodes } from '../types';
const { escapeHtml } = MarkdownIt().utils;

// HTML elements that do not have a matching close tag
// Defined in the HTML standard: https://html.spec.whatwg.org/#void-elements
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export default function render(node: RenderableTreeNodes): string {
  if (typeof node === 'string' || typeof node === 'number')
    return escapeHtml(String(node));

  if (Array.isArray(node)) return node.map(render).join('');

  if (UnsafeRaw.isUnsafeRaw(node)) return node.content;

  if (node === null || typeof node !== 'object' || !Tag.isTag(node)) return '';

  const { name, attributes, children = [] } = node;

  if (!name) return render(children);

  let output = `<${name}`;
  for (const [k, v] of Object.entries(attributes ?? {}))
    output += ` ${k}="${escapeHtml(String(v))}"`;
  output += '>';

  if (voidElements.has(name)) return output;

  if (children.length) output += render(children);
  output += `</${name}>`;

  return output;
}
