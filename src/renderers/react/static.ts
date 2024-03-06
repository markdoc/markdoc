import * as Tag from '../../tag';
import { RenderableTreeNode, RenderableTreeNodes } from '../../types';

import type { ComponentType } from 'react';

type Component = ComponentType<unknown>;

function tagName(
  name: string,
  components: Record<string, Component> | ((string: string) => Component)
): string | Component {
  return typeof name !== 'string'
    ? 'Fragment'
    : name[0] !== name[0].toUpperCase()
    ? name
    : components instanceof Function
    ? components(name)
    : components[name];
}

function renderArray(children: RenderableTreeNode[]): string {
  return children.map(render).join(', ');
}

function deepRender(value: any): any {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value))
    return `[${value.map((item) => deepRender(item)).join(', ')}]`;

  if (value.$$mdtype === 'Tag') return render(value);

  if (typeof value !== 'object') return JSON.stringify(value);

  const object = Object.entries(value)
    .map(([k, v]) => [JSON.stringify(k), deepRender(v)].join(': '))
    .join(', ');

  return `{${object}}`;
}

function render(node: RenderableTreeNodes): string {
  if (Array.isArray(node))
    return `React.createElement(React.Fragment, null, ${renderArray(node)})`;

  if (node === null || typeof node !== 'object' || !Tag.isTag(node))
    return JSON.stringify(node);

  const {
    name,
    attributes: { class: className, ...attrs } = {},
    children = [],
  } = node;

  if (className) attrs.className = className;

  return `React.createElement(
    tagName(${JSON.stringify(name)}, components),
    ${Object.keys(attrs).length == 0 ? 'null' : deepRender(attrs)},
    ${renderArray(children)})`;
}

export default function reactStatic(node: RenderableTreeNodes): string {
  return `
  (({components = {}} = {}) => {
    ${tagName}
    return ${render(node)};
  })
`;
}
