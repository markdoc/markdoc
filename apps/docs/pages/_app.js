import React from 'react';
import Head from 'next/head';

import { AppLink as Link } from '../components/AppLink';
import { Footer, SideNav, TableOfContents, TopNav } from '../components/Shell';

import '@docsearch/css';
import 'prismjs';
import 'prismjs/components/prism-bash.min';
import 'prismjs/components/prism-graphql.min';
import 'prismjs/components/prism-javascript.min';
import 'prismjs/components/prism-json.min';
import 'prismjs/components/prism-jsx.min';
import 'prismjs/components/prism-markup.min';
import 'prismjs/components/prism-toml.min';
import 'prismjs/components/prism-typescript.min';
import 'prismjs/components/prism-yaml.min';
import 'prismjs/plugins/autolinker/prism-autolinker.min';
import 'prismjs/themes/prism.css';
import 'codemirror/lib/codemirror.css';

import '../public/globals.css';

const TITLE = 'Markdoc';
const DESCRIPTION = 'A powerful, flexible, Markdown-based authoring framework';
const MARKDOC = `


  ███    ███  █████  ██████  ██   ██ ██████   ██████   ██████
  ████  ████ ██   ██ ██   ██ ██  ██  ██   ██ ██    ██ ██
  ██ ████ ██ ███████ ██████  █████   ██   ██ ██    ██ ██
  ██  ██  ██ ██   ██ ██   ██ ██  ██  ██   ██ ██    ██ ██
  ██      ██ ██   ██ ██   ██ ██   ██ ██████   ██████   ██████



`;

const FONTS_BASE_URL = process.env.NEXT_PUBLIC_FONTS_BASE_URL || '/fonts';

function collectHeadings(node, sections = []) {
  if (node) {
    if (node.name === 'Heading') {
      const title = node.children[0];

      if (typeof title === 'string') {
        sections.push({
          ...node.attributes,
          title
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        collectHeadings(child, sections);
      }
    }
  }

  return sections;
}

export default function MyApp(props) {
  const { Component, pageProps } = props;
  const { markdoc } = pageProps;

  let title = TITLE;
  let description = DESCRIPTION;
  if (markdoc) {
    if (markdoc.frontmatter.title) {
      title = markdoc.frontmatter.title;
    }
    if (markdoc.frontmatter.description) {
      description = markdoc.frontmatter.description;
    }
  }

  const toc = pageProps.markdoc?.content
    ? collectHeadings(pageProps.markdoc.content)
    : [];

  const isDocs = props.router.asPath.startsWith('/docs');
  const isLandingPage = props.router.pathname === '/';

  React.useEffect(() => console.log(MARKDOC), []);

  return (
    <div className={`${isLandingPage ? 'page--landing' : ''} ${isDocs ? 'page--docs' : ''}`}>
      <Head>
        <title>{`${TITLE} | ${title}`}</title>
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="preload"
          as="font"
          href={`${FONTS_BASE_URL}/GT-America-Mono-Regular.otf`}
          crossOrigin=""
          type="font/otf"
        />
        <link
          rel="preload"
          as="font"
          href={`${FONTS_BASE_URL}/GT-America-Mono-Medium.otf`}
          crossOrigin=""
          type="font/otf"
        />
        <link
          rel="preload"
          as="font"
          href={`${FONTS_BASE_URL}/tiempos-headline-light.woff2`}
          crossOrigin=""
          type="font/woff2"
        />
        <link
          rel="preconnect"
          href={`https://${process.env.NEXT_PUBLIC_ALGOLIA_APP_ID}-dsn.algolia.net`}
          crossOrigin=""
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="referrer" content="strict-origin" />
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://markdoc.dev" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta
          property="og:image"
          content="https://markdoc.dev/images/share.png"
        />
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:image"
          content="https://markdoc.dev/images/share.png"
        />
        <style>
          {`
          @font-face {
            font-family: 'GT America Mono';
            font-style: normal;
            font-weight: normal;
            src: url('${FONTS_BASE_URL}/GT-America-Mono-Regular.otf')
              format('opentype');
          }

          @font-face {
            font-family: 'GT America Mono';
            font-style: normal;
            font-weight: 500;
            src: url('${FONTS_BASE_URL}/GT-America-Mono-Medium.otf')
              format('opentype');
          }

          @font-face {
            font-family: 'Tiempos';
            font-style: normal;
            src: url('${FONTS_BASE_URL}/tiempos-headline-light.woff2');
            font-display: block;
          }
        `}
        </style>
      </Head>
      {/* https://webaim.org/techniques/skipnav/ */}
      <a href="#skip-nav" className="skip-nav">
        Skip to content
      </a>
      <TopNav>
        <Link href="/docs/getting-started">Docs</Link>
        <Link href="https://github.com/markdoc/markdoc">GitHub</Link>
        <Link href="https://github.com/markdoc/markdoc/discussions">
          Community
        </Link>
        <Link href="https://twitter.com/StripeDev">Twitter</Link>
        <span className="primary no-mobile">
          <Link href="/sandbox">Try</Link>
        </span>
      </TopNav>
      <div className="page">
        {isDocs ? <SideNav /> : null}
        <main className="flex column">
          <div id="skip-nav" />
          <Component {...pageProps} />
        </main>
        {isDocs && toc ? <TableOfContents toc={toc} /> : null}
      </div>
      <div className="footer-bar">
        <Footer landing={isLandingPage}>
          <Link href="/docs/getting-started">Docs</Link>
          <Link href="https://github.com/markdoc/markdoc">GitHub</Link>
          <Link href="https://github.com/markdoc/markdoc/discussions">
            Community
          </Link>
          <Link href="https://twitter.com/StripeDev">Twitter</Link>
        </Footer>
      </div>

    </div>
  );
}
