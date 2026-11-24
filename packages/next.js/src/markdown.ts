import fs = require('node:fs');
import path = require('node:path');

// The App Router directory that serves pages as Markdown, relative to the app directory.
export const MARKDOWN_ROUTE_DIR = 'markdoc/[[...path]]';
export const MARKDOWN_ROUTE_PREFIX = '/markdoc';

// Rewrite `has` values match the whole header value. Markdown is preferred when
// text/markdown is listed before any text/html, or when text/plain is listed first;
// requiring text/plain to come first keeps defaults such as axios's
// `application/json, text/plain, */*` on HTML. A q=0 entry is never preferred.
export const MARKDOWN_ACCEPT_PATTERN =
  '(?:\\s*text/plain|(?:(?!text/html).)*?text/markdown)(?![^,]*;\\s*q=0(?:\\.0{0,3})?\\s*(?:,|$)).*';

// Page paths only: skip Next.js assets, files with an extension and the Markdown route itself.
const PAGE_PATH = `(?!_next/|markdoc(?:/|$))[^.]+`;

type Rewrite = {
  source: string;
  destination: string;
  has?: { type: 'header'; key: string; value?: string }[];
};

export type Rewrites =
  | Rewrite[]
  | { beforeFiles?: Rewrite[]; afterFiles?: Rewrite[]; fallback?: Rewrite[] };

type Header = { source: string; headers: { key: string; value: string }[] };

function accepts(rewrite: Omit<Rewrite, 'has'>): Rewrite {
  return {
    ...rewrite,
    has: [{ type: 'header', key: 'accept', value: MARKDOWN_ACCEPT_PATTERN }],
  };
}

export function markdownRewrites() {
  return {
    // Header negotiation must run before the filesystem match, or the HTML page wins.
    beforeFiles: [
      accepts({ source: '/', destination: MARKDOWN_ROUTE_PREFIX }),
      accepts({
        source: `/:path(${PAGE_PATH})`,
        destination: `${MARKDOWN_ROUTE_PREFIX}/:path`,
      }),
    ],
    afterFiles: [
      // The home page has no path to append `.md` to
      { source: '/.md', destination: MARKDOWN_ROUTE_PREFIX },
      { source: '/index.md', destination: MARKDOWN_ROUTE_PREFIX },
      {
        source: `/:path(${PAGE_PATH})\\.md`,
        destination: `${MARKDOWN_ROUTE_PREFIX}/:path`,
      },
    ],
  };
}

// The same URL serves HTML or Markdown depending on Accept, so caches must key on it.
export function markdownHeaders(): Header[] {
  const headers = [{ key: 'Vary', value: 'Accept' }];
  return [
    { source: '/', headers },
    { source: `/:path(${PAGE_PATH})`, headers },
  ];
}

export function mergeRewrites(rewrites: Rewrites | undefined): Rewrites {
  const markdown = markdownRewrites();
  // User rules come first so they keep priority over the generated ones.
  if (!rewrites || Array.isArray(rewrites)) {
    return {
      beforeFiles: markdown.beforeFiles,
      afterFiles: [...(rewrites || []), ...markdown.afterFiles],
      fallback: [],
    };
  }
  return {
    ...rewrites,
    beforeFiles: [...(rewrites.beforeFiles || []), ...markdown.beforeFiles],
    afterFiles: [...(rewrites.afterFiles || []), ...markdown.afterFiles],
  };
}

export function hasMarkdownRoute(
  appDir: string | undefined,
  extensions: string[]
): boolean {
  if (!appDir) return false;
  const directory = path.join(appDir, MARKDOWN_ROUTE_DIR);
  return extensions.some((extension) =>
    fs.existsSync(path.join(directory, `route.${extension}`))
  );
}

/**
 * Returns the URL a page file is served at, or undefined when it can't be served as
 * Markdown. `relative` is the page's posix path relative to the app directory.
 */
export function getPageUrl(relative: string): string | undefined {
  const segments = relative.split('/').slice(0, -1);
  if (
    segments.some(
      (segment) =>
        segment.startsWith('_') || // private folders
        segment.startsWith('@') || // parallel route slots
        segment.startsWith('(.') || // interception routes
        segment.includes('['), // dynamic segments
    )
  )
    return;
  const url = segments.filter(
    (segment) => !(segment.startsWith('(') && segment.endsWith(')'))
  );
  return `/${url.join('/')}`;
}

/**
 * Finds the App Router pages to serve as Markdown, keyed by URL, with each page's path
 * relative to the app directory.
 */
export function findPages(
  appDir: string,
  extensions: string[]
): Record<string, string> {
  const filename = new RegExp(
    `(^|/)page\\.(${extensions.map(escapeRegExp).join('|')})$`
  );
  const files = fs.readdirSync(appDir, { recursive: true, encoding: 'utf8' });
  const pages: Record<string, string> = {};
  for (const file of files.map((f) => f.split(path.sep).join('/')).sort()) {
    if (!filename.test(file)) continue;
    const url = getPageUrl(file);
    if (url !== undefined) pages[url] = file;
  }
  return pages;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
