'use client';

import { Tag, type RenderableTreeNodes } from '@markdoc/markdoc';

export type HeadingEntry = { id?: string; level?: number; title: string };
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav } from './SideNav';
import { TableOfContents } from './TableOfContents';

export function collectHeadings(node: RenderableTreeNodes, sections: HeadingEntry[] = []): HeadingEntry[] {
  if (!Tag.isTag(node)) return sections;
  if (node.name === 'Heading' && typeof node.children[0] === 'string') {
    sections.push({ ...node.attributes, title: node.children[0] });
  }
  for (const child of node.children || []) collectHeadings(child, sections);
  return sections;
}

export function PageBody({ children, toc = [] }: { children: ReactNode; toc?: HeadingEntry[] }) {
  const docs = usePathname().startsWith('/docs');
  return (
    <div className="page">
      {docs ? <SideNav /> : null}
      <main className="flex column">
        <div id="skip-nav" />
        {children}
      </main>
      {docs ? <TableOfContents toc={toc} /> : null}
    </div>
  );
}
