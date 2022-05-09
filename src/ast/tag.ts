import type { RenderableTreeNode } from '../types';

export default class Tag {
  readonly $$mdtype = 'Tag' as const;

  name: string;
  attributes: Record<string, any>;
  children: RenderableTreeNode[];

  constructor(
    name = 'div',
    attributes = {},
    children: RenderableTreeNode[] = []
  ) {
    this.name = name;
    this.attributes = attributes;
    this.children = children;
  }
}
