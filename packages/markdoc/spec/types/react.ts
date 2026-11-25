import Markdoc from '@markdoc/markdoc';
import type { ComponentType, ReactNode } from 'react';

declare const React: typeof import('react');
declare const Heading: ComponentType<{ children?: ReactNode }>;

export const rendered: ReactNode = Markdoc.renderers.react(
  Markdoc.transform(Markdoc.parse('# Hello')),
  React,
  { components: { Heading, Code: 'code' } },
);

export const staticRenderer: string = Markdoc.renderers.reactStatic(
  Markdoc.transform(Markdoc.parse('# Hello')),
);

export const intrinsicResolver: ReactNode = Markdoc.renderers.react(
  new Markdoc.Tag('Code', {}, ['example']),
  React,
  { components: () => 'code' },
);
