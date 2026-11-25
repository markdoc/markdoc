'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

export function Heading({ id = '', level = 1, children, className }: { id?: string; level?: 1 | 2 | 3 | 4 | 5 | 6; children?: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const Component = `h${level}` as const;

  const isDocs = pathname.startsWith('/docs');

  const link = (
    <Component className={['heading', className].filter(Boolean).join(' ')}>
      <div id={id} />
      {children}
      <style jsx>
        {`
          a {
            text-decoration: none;
          }
          a:hover {
            opacity: 1;
          }
          div {
            position: absolute;
            top: calc(-1 * (var(--nav-height) + 44px));
          }
        `}
      </style>
    </Component>
  );

  return isDocs && level !== 1 ? (
    <a href={`#${id}`}>
      {link}
      <style jsx>
        {`
          a {
            text-decoration: none;
          }
          a:hover {
            opacity: 1;
          }
          a :global(.heading::after) {
            opacity: 0;
            color: var(--toc-border);
            content: '  #';
            transition: opacity 250ms ease;
          }
          a :global(.heading:hover::after) {
            opacity: 1;
          }
        `}
      </style>
    </a>
  ) : (
    link
  );
}
