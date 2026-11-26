import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownHref } from '../lib/markdown-link.ts';

const site = 'https://markdoc.dev';

test('Markdown links use absolute guide URLs and preserve query strings and fragments', () => {
  for (const [href, expected] of [
    ['/docs/syntax', `${site}/docs/syntax.md`],
    ['/docs/syntax/', `${site}/docs/syntax.md`],
    ['/docs/examples/nextjs?source=guide#app-router', `${site}/docs/examples/nextjs.md?source=guide#app-router`],
    [`${site}/docs/render#markdown`, `${site}/docs/render.md#markdown`],
    [`${site}/docs/render.md#markdown`, `${site}/docs/render.md#markdown`],
    ['//markdoc.dev/docs/tags', `${site}/docs/tags.md`],
    ['/', `${site}/index.md`],
    ['/docs', `${site}/docs/getting-started.md`],
    ['/docs/nextjs', `${site}/docs/examples/nextjs.md`]
  ]) {
    assert.equal(markdownHref(href, site), expected, href);
  }
});

test('Markdown links keep interactive pages and assets at their existing paths', () => {
  for (const href of [
    '/sandbox?mode=ast',
    '/spec',
    '/images/share.png',
    '/docs/example.pdf',
    '/.well-known/skills/setup-markdoc/SKILL.md',
    '/llms.txt'
  ]) {
    assert.equal(markdownHref(href, site), `${site}${href}`, href);
  }
});

test('Markdown links leave external URLs and document-relative references alone', () => {
  for (const href of [
    'https://example.com/docs/syntax',
    '//example.com/docs/syntax',
    'https://markdoc.dev.example.com/docs/syntax',
    'mailto:hello@example.com',
    '#annotations',
    '?language=en',
    './syntax.md',
    '../tags.md',
    'https://[invalid',
    ''
  ]) {
    assert.equal(markdownHref(href, site), href, href);
  }
});
