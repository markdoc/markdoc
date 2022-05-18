import type { Schema } from './types';
import Tag from './ast/tag';

export const document: Schema = {
  render: 'article',
  children: [
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
  attributes: {
    frontmatter: { render: false },
  },
};

export const heading: Schema = {
  children: ['inline'],
  attributes: {
    level: { type: Number, render: false, required: true },
  },
  transform(node, config) {
    return new Tag(
      `h${node.attributes['level']}`,
      node.transformAttributes(config),
      node.transformChildren(config)
    );
  },
};

export const paragraph: Schema = {
  render: 'p',
  children: ['inline'],
};

export const image: Schema = {
  render: 'img',
  attributes: {
    src: { type: String, required: true },
    alt: { type: String },
    // width/height attributes will need to be to be implemented as an extension to markdown-it
  },
};

export const fence: Schema = {
  render: 'pre',
  attributes: {
    content: { type: String, render: false, required: true },
    language: { type: String, render: 'data-language' },
    process: { type: Boolean, render: false, default: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.children.length
      ? node.transformChildren(config)
      : [node.attributes.content];

    return new Tag('pre', attributes, children);
  },
};

export const blockquote: Schema = {
  render: 'blockquote',
  children: [
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
};

export const item: Schema = {
  render: 'li',
  children: [
    'inline',
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
};

export const list: Schema = {
  children: ['item'],
  attributes: {
    ordered: { type: Boolean, render: false, required: true },
  },
  transform(node, config) {
    return new Tag(
      node.attributes.ordered ? 'ol' : 'ul',
      node.transformAttributes(config),
      node.transformChildren(config)
    );
  },
};

export const hr: Schema = {
  render: 'hr',
};

export const table: Schema = {
  render: 'table',
};

export const td: Schema = {
  render: 'td',
  children: [
    'inline',
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
  attributes: {
    colspan: { type: Number },
    rowspan: { type: Number },
    align: { type: String },
  },
};

export const th: Schema = {
  render: 'th',
  attributes: {
    width: { type: Number },
    align: { type: String },
  },
};

export const tr: Schema = {
  render: 'tr',
  children: ['th', 'td'],
};

export const tbody: Schema = {
  render: 'tbody',
  children: ['tr', 'tag'],
};

export const thead: Schema = {
  render: 'thead',
  children: ['tr'],
};

export const strong: Schema = {
  render: 'strong',
  children: ['em', 's', 'link', 'code', 'text', 'tag'],
};

export const em: Schema = {
  render: 'em',
  children: ['strong', 's', 'link', 'code', 'text', 'tag'],
};

export const s: Schema = {
  render: 's',
  children: ['strong', 'em', 'link', 'code', 'text', 'tag'],
};

export const inline: Schema = {
  children: [
    'strong',
    'em',
    's',
    'code',
    'text',
    'tag',
    'link',
    'image',
    'hardbreak',
    'softbreak',
  ],
};

export const link: Schema = {
  render: 'a',
  children: ['strong', 'em', 's', 'code', 'text', 'tag'],
  attributes: {
    href: { type: String, required: true },
    title: { type: String },
  },
};

export const code: Schema = {
  render: 'code',
  attributes: {
    content: { type: String, render: false, required: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    return new Tag('code', attributes, [node.attributes.content]);
  },
};

export const text: Schema = {
  attributes: {
    content: { type: String, required: true },
  },
  transform(node) {
    return node.attributes.content;
  },
};

export const hardbreak: Schema = {
  render: 'br',
};

export const softbreak: Schema = {
  transform(_node, _config) {
    return ' ';
  },
};

export const error = {};

export const footnote_ref: Schema = {
  children: ['link'],
  attributes: {
    id: { type: String, render: true, required: true },
    href: { type: String, render: true, required: true },
    label: { type: String, render: false, required: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const link = new Tag('a', attributes, [`${node.attributes.label}`]);
    return new Tag(`sup`, { class: 'footnote-ref' }, [link]);
  },
};

export const footnote: Schema = {
  children: ['paragraph', 'inline'],
  attributes: {
    id: { type: String, render: true, required: true },
    class: { type: String, render: true, required: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.transformChildren(config);
    return new Tag(`li`, attributes, children);
  },
};

export const footnote_block: Schema = {
  children: ['item'],
  attributes: {
    id: { type: String, render: false, required: true },
  },
  transform(node, config) {
    const children = node.transformChildren(config);
    const list = new Tag('ol', { class: 'footnotes-list' }, children);
    return new Tag(`section`, { class: 'footnotes' }, [list]);
  },
};

export const footnote_anchor: Schema = {
  children: ['text'],
  attributes: {
    class: { type: String, render: true, required: true },
    href: { type: String, render: true, required: true },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    return new Tag('a', attributes, ['↩']);
  },
};
