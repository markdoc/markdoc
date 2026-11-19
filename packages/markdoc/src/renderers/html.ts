import MarkdownIt from 'markdown-it';
import Tag from '../tag';
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

// Names are written into the markup verbatim, so reject anything that would
// end the tag or attribute early. Based on the HTML tokenizer's tag name and
// attribute name states: https://html.spec.whatwg.org/#tokenization
const tagName = /^[a-zA-Z][^\s/>\0]*$/;
const attributeName = /^[^\s"'>/=\0]+$/;

export default function render(node: RenderableTreeNodes): string {
  if (typeof node === 'string' || typeof node === 'number')
    return escapeHtml(String(node));

  if (Array.isArray(node)) return node.map(render).join('');

  if (node === null || typeof node !== 'object' || !Tag.isTag(node)) return '';

  const { name, attributes, children = [] } = node;

  if (!name || !tagName.test(name)) return render(children);

  let output = `<${name}`;
  for (const [k, v] of Object.entries(attributes ?? {}))
    if (v != null && attributeName.test(k))
      output += ` ${k.toLowerCase()}="${escapeHtml(String(v))}"`;
  output += '>';

  if (voidElements.has(name)) return output;

  if (children.length) output += render(children);
  output += `</${name}>`;

  return output;
}
