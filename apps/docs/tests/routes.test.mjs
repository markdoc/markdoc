import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);
const appDir = fileURLToPath(new URL('..', import.meta.url));
const site = 'https://markdoc.dev';
const files = (
  await readdir(path.join(appDir, 'content'), { recursive: true })
).filter((file) => file.endsWith('.md'));
const pages = await Promise.all(
  files.map(async (file) => {
    const source = await readFile(path.join(appDir, 'content', file), 'utf8');
    return {
      route:
        `/${file.split(path.sep).join('/')}`
          .replace(/\.md$/, '')
          .replace(/\/index$/, '') || '/',
      frontmatter: yaml.load(source.match(/^---\n([\s\S]*?)\n---/)[1])
    };
  })
);

let server;
let origin;

before(async () => {
  server = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'start', '--port', '0'],
    {
      cwd: appDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(
      () => reject(new Error(`Next.js did not start:\n${output}`)),
      20000
    );
    const collect = (chunk) => {
      output += chunk;
      if (output.includes('Ready in')) {
        const port = output.match(/localhost:(\d+)/)?.[1];
        if (port) {
          origin = `http://127.0.0.1:${port}`;
          clearTimeout(timeout);
          resolve();
        }
      }
    };
    server.stdout.on('data', collect);
    server.stderr.on('data', collect);
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Next.js exited (${code}):\n${output}`));
    });
  });
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
});

function escapeHTML(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
}

for (const { route, frontmatter } of pages) {
  test(`${route} renders its document and frontmatter metadata`, async () => {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('<main'), 'page shell is server rendered');
    assert.ok(html.includes('<article'), 'document is server rendered');
    assert.ok(
      html.includes(`<title>Markdoc | ${escapeHTML(frontmatter.title)}</title>`)
    );
    if (frontmatter.description) {
      assert.ok(
        html.includes(
          `<meta name="description" content="${escapeHTML(frontmatter.description)}"`
        )
      );
    }
    assert.ok(
      html.includes(
        `<link rel="canonical" href="${site}${route === '/' ? '' : route}"`
      )
    );
    assert.ok(
      html.includes('<style id="__jsx-'),
      'Styled JSX styles are server rendered'
    );
  });
}

test('legacy docs and English URLs redirect to their existing destinations', async () => {
  for (const [from, to, status] of [
    ['/docs', '/docs/getting-started', 307],
    ['/en/docs/syntax', '/docs/syntax', 308],
    ['/en', '/', 308]
  ]) {
    const response = await fetch(`${origin}${from}`, { redirect: 'manual' });
    assert.equal(response.status, status);
    assert.equal(
      new URL(response.headers.get('location'), origin).pathname,
      to
    );
  }
});

test('spec rewrite and missing-page response still work', async () => {
  const spec = await fetch(`${origin}/spec`);
  assert.equal(spec.status, 200);
  assert.match(await spec.text(), /Markdoc/);
  const missing = await fetch(`${origin}/this-page-does-not-exist`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Page not found/);
});

test('sitemap and robots cover every content route and the specification', async () => {
  const response = await fetch(`${origin}/sitemap.xml`);
  assert.equal(response.status, 200);
  const sitemap = await response.text();
  const urls = Array.from(
    sitemap.matchAll(/<loc>(.*?)<\/loc>/g),
    (match) => match[1]
  );
  assert.deepEqual(
    urls.sort(),
    [...pages.map(({ route }) => `${site}${route}`), `${site}/spec`].sort()
  );
  const robots = await fetch(`${origin}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(
    await robots.text(),
    /Sitemap: https:\/\/markdoc.dev\/sitemap.xml/
  );
});
