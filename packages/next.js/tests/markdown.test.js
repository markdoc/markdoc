import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  getPageUrl,
  MARKDOWN_ACCEPT_PATTERN,
  markdownHeaders,
  mergeRewrites,
} = require('../dist/markdown');
const withMarkdoc = require('../dist/index.js');

describe('Accept header', () => {
  // Next.js matches `has` values against the whole header value
  const matcher = new RegExp(`^${MARKDOWN_ACCEPT_PATTERN}$`);

  test.each([
    ['Chrome', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'],
    ['Firefox and Safari', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    ['curl', '*/*'],
    ['axios', 'application/json, text/plain, */*'],
    ['HTML before Markdown', 'text/html, text/markdown'],
    ['Markdown refused', 'text/markdown;q=0'],
    ['Markdown refused with padding', 'text/markdown; q=0.000, text/html'],
    ['plain text after a refused type', 'text/markdown;q=0, text/plain'],
  ])('serves HTML to %s', (_, accept) => {
    expect(matcher.test(accept)).toBe(false);
  });

  test.each([
    ['Markdown', 'text/markdown'],
    ['Markdown before HTML', 'text/markdown, text/html'],
    ['agents', 'text/markdown, text/html;q=0.9, */*;q=0.8'],
    ['Markdown with a nonzero q', 'text/markdown;q=0.5'],
    ['Markdown after another type', 'application/json, text/markdown'],
    ['plain text', 'text/plain'],
    ['plain text listed first', 'text/plain;q=0.9, */*'],
  ])('serves Markdown to %s', (_, accept) => {
    expect(matcher.test(accept)).toBe(true);
  });
});

test.each([
  ['page.md', '/'],
  ['docs/getting-started/page.md', '/docs/getting-started'],
  ['(marketing)/pricing/page.md', '/pricing'],
  ['_drafts/page.md', undefined],
  ['blog/[slug]/page.md', undefined],
  ['docs/[[...path]]/page.md', undefined],
  ['@modal/login/page.md', undefined],
  ['feed/(..)photo/page.md', undefined],
])('serves %s at %s', (file, url) => {
  expect(getPageUrl(file)).toBe(url);
});

describe('mergeRewrites', () => {
  const user = { source: '/old', destination: '/new' };

  test('runs header negotiation before the filesystem', () => {
    const { beforeFiles, afterFiles, fallback } = mergeRewrites(undefined);
    expect(beforeFiles.map((rewrite) => rewrite.destination)).toEqual([
      '/markdoc',
      '/markdoc/:path',
    ]);
    expect(beforeFiles.every((rewrite) => rewrite.has[0].key === 'accept')).toBe(true);
    expect(afterFiles.map((rewrite) => rewrite.source)).toEqual([
      '/.md',
      '/index.md',
      '/:path((?!_next/|markdoc(?:/|$))[^.]+)\\.md',
    ]);
    expect(fallback).toEqual([]);
  });

  test('keeps array rewrites ahead of the Markdown rewrites', () => {
    const { afterFiles } = mergeRewrites([user]);
    expect(afterFiles[0]).toBe(user);
    expect(afterFiles).toHaveLength(4);
  });

  test('keeps each phase of object rewrites ahead of the Markdown rewrites', () => {
    const fallback = [{ source: '/:path*', destination: 'https://example.com/:path*' }];
    const rewrites = mergeRewrites({ beforeFiles: [user], afterFiles: [user], fallback });
    expect(rewrites.beforeFiles[0]).toBe(user);
    expect(rewrites.beforeFiles).toHaveLength(3);
    expect(rewrites.afterFiles[0]).toBe(user);
    expect(rewrites.afterFiles).toHaveLength(4);
    expect(rewrites.fallback).toBe(fallback);
  });
});

test('Markdown and asset paths are excluded from negotiation', () => {
  const [, { source }] = markdownHeaders();
  const pattern = new RegExp(`^/${source.slice('/:path('.length, -1)}$`);
  expect(pattern.test('/docs/getting-started')).toBe(true);
  expect(pattern.test('/_next/static/chunks/main.js')).toBe(false);
  expect(pattern.test('/favicon.ico')).toBe(false);
  expect(pattern.test('/markdoc/docs')).toBe(false);
});

describe('withMarkdoc', () => {
  function project(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdoc-next-'));
    for (const file of files) {
      fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), '');
    }
    return dir;
  }

  test('leaves routing alone without the Markdown route file', () => {
    const dir = project(['app/page.md']);
    try {
      const rewrites = () => [];
      const config = withMarkdoc({ dir })({ rewrites });
      expect(config.rewrites).toBe(rewrites);
      expect(config.headers).toBeUndefined();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test.each(['app', 'src/app'])(
    'serves Markdown once %s/markdoc/[[...path]]/route.md exists',
    async (appDir) => {
      const dir = project([`${appDir}/markdoc/[[...path]]/route.md`]);
      try {
        const user = { source: '/old', destination: '/new' };
        const header = { source: '/old', headers: [{ key: 'X-Old', value: '1' }] };
        const config = withMarkdoc({ dir })({
          rewrites: async () => [user],
          headers: async () => [header],
        });

        const rewrites = await config.rewrites();
        expect(rewrites.afterFiles[0]).toBe(user);
        expect(rewrites.beforeFiles).toHaveLength(2);

        const headers = await config.headers();
        expect(headers[0]).toBe(header);
        expect(headers.slice(1)).toEqual(markdownHeaders());
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  test('finds the route file with a custom extension', async () => {
    const dir = project(['app/markdoc/[[...path]]/route.markdown']);
    try {
      const config = withMarkdoc({ dir, extension: /\.(markdown)$/ })({});
      expect((await config.rewrites()).beforeFiles).toHaveLength(2);
      expect(await config.headers()).toEqual(markdownHeaders());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
