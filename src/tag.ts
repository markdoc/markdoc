import type { RenderableTreeNode } from './types';

export interface Tag<
  N extends string = string,
  A extends Record<string, any> = Record<string, any>
> {
  $$mdtype: 'Tag';
  name: N;
  attributes: A;
  children: RenderableTreeNode[];
}

export function createTag<
  N extends string = string,
  A extends Record<string, any> = Record<string, any>
>(
  name: N = 'div' as N,
  attributes: A = {} as A,
  children: RenderableTreeNode[] = []
) {
  const tag: Tag = {
    $$mdtype: 'Tag',
    name,
    attributes,
    children,
  };

  return tag;
}

export function isTag(tag: any): tag is Tag {
  return !!(tag?.$$mdtype === 'Tag');
}
