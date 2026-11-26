import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@docsearch/css/dist/style.css';
import 'prismjs/themes/prism.css';
import 'codemirror/lib/codemirror.css';
import '../public/globals.css';

import { DESCRIPTION, SITE_URL, TITLE } from '../lib/metadata';
import { SiteLayout } from '../components/Shell/SiteLayout';
import StyledJsxRegistry from './registry';

const fonts = process.env.NEXT_PUBLIC_FONTS_BASE_URL || '/fonts';
const algolia = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `${TITLE} | %s` },
  description: DESCRIPTION,
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    url: './',
    images: ['/images/share.png']
  },
  twitter: {
    card: 'summary',
    images: ['/images/share.png']
  },
  referrer: 'strict-origin',
  icons: { icon: '/favicon.ico', shortcut: '/favicon.ico' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="describedby" href={`${SITE_URL}/llms.txt`} type="text/plain" />
        <link
          rel="preload"
          as="font"
          href={`${fonts}/GT-America-Mono-Regular.otf`}
          crossOrigin=""
          type="font/otf"
        />
        <link
          rel="preload"
          as="font"
          href={`${fonts}/GT-America-Mono-Medium.otf`}
          crossOrigin=""
          type="font/otf"
        />
        <link
          rel="preload"
          as="font"
          href={`${fonts}/tiempos-headline-light.woff2`}
          crossOrigin=""
          type="font/woff2"
        />
        {algolia ? (
          <link
            rel="preconnect"
            href={`https://${algolia}-dsn.algolia.net`}
            crossOrigin=""
          />
        ) : null}
        <style>{`
          @font-face {
            font-family: 'GT America Mono';
            font-style: normal;
            font-weight: normal;
            src: url('${fonts}/GT-America-Mono-Regular.otf') format('opentype');
          }
          @font-face {
            font-family: 'GT America Mono';
            font-style: normal;
            font-weight: 500;
            src: url('${fonts}/GT-America-Mono-Medium.otf') format('opentype');
          }
          @font-face {
            font-family: 'Tiempos';
            font-style: normal;
            src: url('${fonts}/tiempos-headline-light.woff2');
            font-display: block;
          }
        `}</style>
      </head>
      <body>
        <StyledJsxRegistry>
          <SiteLayout>{children}</SiteLayout>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}
