import * as Tag from '../../tag';
import { RenderableTreeNodes, Scalar } from '../../types';

import type { createElement, ComponentType, Fragment, ReactNode } from 'react';

type ReactShape = Readonly<{
  createElement: typeof createElement;
  Fragment: typeof Fragment;
}>;

type Component = ComponentType<unknown>;

function tagName(
  name: string,
  components: Record<string, Component> | ((string: string) => Component)
): string | Component {
  return typeof name !== 'string'
    ? name // This can be an object, e.g. when React.forwardRef is used
    : name[0] !== name[0].toUpperCase()
    ? name
    : components instanceof Function
    ? components(name)
    : components[name];
}

export default function dynamic(
  node: RenderableTreeNodes,
  React: ReactShape,
  { components = {} } = {}
) {
  function deepRender(value: any): any {
    if (value == null || typeof value !== 'object') return value;

    if (Array.isArray(value)) return value.map((item) => deepRender(item));

    if (value.$$mdtype === 'Tag') return render(value);

    if (typeof value !== 'object') return value;

    const output: Record<string, Scalar> = {};
    for (const [k, v] of Object.entries(value)) output[k] = deepRender(v);
    return output;
  }

  function render(node: RenderableTreeNodes): ReactNode {
    if (Array.isArray(node))
      return React.createElement(React.Fragment, null, ...node.map(render));

    if (node === null || typeof node !== 'object' || !Tag.isTag(node))
      return node;

    const {
      name,
      attributes: { class: className, ...attrs } = {},
      children = [],
    } = node;

    if (className) attrs.className = className;

    return React.createElement(
      tagName(name, components),
      Object.keys(attrs).length == 0 ? null : deepRender(attrs),
      ...children.map(render)
    );
  }

  return render(node);
}
