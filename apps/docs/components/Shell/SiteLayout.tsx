'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppLink as Link } from '../AppLink';
import { Footer } from './Footer';
import { TopNav } from './TopNav';

function NavigationLinks() {
  return (
    <>
      <Link href="/docs/getting-started">Docs</Link>
      <Link href="https://github.com/markdoc/markdoc">GitHub</Link>
      <Link href="https://github.com/markdoc/markdoc/discussions">
        Community
      </Link>
      <Link href="https://twitter.com/StripeDev">Twitter</Link>
    </>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const landing = pathname === '/';
  const docs = pathname.startsWith('/docs');

  return (
    <div
      className={`${landing ? 'page--landing' : ''} ${docs ? 'page--docs' : ''}`}
    >
      <a href="#skip-nav" className="skip-nav">
        Skip to content
      </a>
      <TopNav>
        <NavigationLinks />
        <span className="primary no-mobile">
          <Link href="/sandbox">Try</Link>
        </span>
      </TopNav>
      {children}
      <div className="footer-bar">
        <Footer landing={landing}>
          <NavigationLinks />
        </Footer>
      </div>
    </div>
  );
}
