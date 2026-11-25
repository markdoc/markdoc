import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');
const os = require('os');
const React = require('react');
const enhancedResolve = require('enhanced-resolve');
const loader = require('../dist/loader');

const source = fs.readFileSync(require.resolve('./fixture.md'), 'utf-8');
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleDebugMock = vi.spyOn(console, 'debug').mockImplementation(() => {});

// https://stackoverflow.com/questions/53799385/how-can-i-convert-a-windows-path-to-posix-path-using-node-path
function normalizeAbsolutePath(s) {
  return s
    .replace(/^[a-zA-Z]:/, '') // replace C: for Windows
    .split(path.sep)
    .join(path.posix.sep);
}

function normalizeOperatingSystemPaths(s) {
  return s
    .replace(normalizeAbsolutePath(process.cwd()), '.')
    .split(path.sep)
    .join(path.posix.sep)
    .replace(/\/r\/n/g, '\\n');
}

function createRequireContext(requireFn) {
  return (base = '.') => {
    const files = [];

    function readDirectory(directory) {
      fs.readdirSync(directory).forEach((file) => {
        const fullPath = path.resolve(directory, file);

        if (fs.statSync(fullPath).isDirectory()) {
          readDirectory(fullPath);
        }

        files.push(fullPath);
      });
    }

    readDirectory(path.resolve(__dirname, base));

    return Object.assign(requireFn, {keys: () => files});
  };
}

function evaluate(output, filename = path.join(__dirname, 'pages/test/index.md')) {
  const {code} = babel.transformSync(output, {filename});

  const resourceRequire = Module.createRequire(filename);
  const baseRequire = require;

  const customRequire = (specifier) => {
    if (specifier === '@markdoc/next.js/runtime') {
      return require('../dist/runtime');
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return resourceRequire(specifier);
    }

    return baseRequire(specifier);
  };

  customRequire.resolve = (specifier) => {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return resourceRequire.resolve(specifier);
    }

    return baseRequire.resolve(specifier);
  };

  customRequire.cache = baseRequire.cache;
  customRequire.main = baseRequire.main;
  customRequire.extensions = baseRequire.extensions;
  customRequire.paths = baseRequire.paths;

  const context = createRequireContext(customRequire);
  customRequire.context = context;
  require.context = context;

  const exports = {};
  const module = {exports};

  vm.runInNewContext(code, {
    exports,
    module,
    require: customRequire,
    console,
    Response,
  });

  return module.exports;
}

function options(config = {}) {
  const dir = path.join(__dirname, config.appDir ? 'app' : 'pages');

  const webpackThis = {
    context: __dirname,
    getOptions() {
      return {
        ...config,
        dir: __dirname,
        nextRuntime: 'nodejs',
        appDir: config.appDir ? dir : undefined,
        pagesDir: config.appDir ? undefined : dir,
      };
    },
    getLogger() {
      return console;
    },
    addDependency() {},
    addContextDependency() {},
    getResolve: (options) => {
      const resolve = enhancedResolve.create(options);
      return async (context, file) =>
        new Promise((res, rej) =>
          resolve(context, file, (err, result) => (err ? rej(err) : res(result)))
        ).then(normalizeAbsolutePath);
    },
    resourcePath: path.join(dir, 'test', config.appDir ? 'page.md' : 'index.md'),
  };

  return webpackThis;
}

async function callLoader(config, source) {
  return new Promise((res, rej) => {
    config.async = () => (error, result) => {
      if (error) {
        rej(error);
      } else {
        res(result);
      }
    };
    loader.call(config, source);
  });
}

test('should not fail build if default `schemaPath` is used', async () => {
  await expect(callLoader(options(), source)).resolves.toEqual(expect.any(String));
});

test('should fail build if invalid `schemaPath` is used', async () => {
  await expect(callLoader(options({schemaPath: 'unknown_schema_path'}), source)).rejects.toThrow(
    "Cannot find module 'unknown_schema_path'"
  );
});

test('file output is correct', async () => {
  const webpackThis = options();
  const output = await callLoader(webpackThis, source);

  expect(normalizeOperatingSystemPaths(output)).toMatchSnapshot();

  const page = evaluate(output, webpackThis.resourcePath);

  expect(page).toEqual({
    default: expect.any(Function),
    getStaticProps: expect.any(Function),
    markdoc: {
      frontmatter: {
        title: 'Custom title',
      },
    },
  });

  const data = await page.getStaticProps({});
  expect(data.props.markdoc).toEqual({
    content: {
      $$mdtype: 'Tag',
      name: 'article',
      attributes: {},
      children: [
        {
          $$mdtype: 'Tag',
          name: 'h1',
          attributes: {},
          children: ['Custom title'],
        },
      ],
    },
    frontmatter: {
      title: 'Custom title',
    },
    file: {
      path: '/test/index.md',
    },
  });

  expect(page.default(data.props)).toEqual(
    React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
  );
});

test('app router', async () => {
  const webpackThis = options({appDir: true});
  const output = await callLoader(webpackThis, source);

  expect(normalizeOperatingSystemPaths(output)).toMatchSnapshot();

  const page = evaluate(output, webpackThis.resourcePath);

  expect(page).toEqual({
    default: expect.any(Function),
    getMarkdown: expect.any(Function),
    metadata: {title: 'Custom title'},
  });

  expect(await page.default({})).toEqual(
    React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
  );
});

test('app router metadata uses flat title and description without other frontmatter', async () => {
  const context = options({appDir: true});
  const output = await callLoader(context, source.replace('---', '---\ndescription: A custom description\nauthor: Someone\ndraft: true'));
  expect(evaluate(output, context.resourcePath).metadata).toEqual({
    title: 'Custom title',
    description: 'A custom description',
  });
});

test('app router metadata', async () => {
  const webpackThis = options({appDir: true});
  const output = await callLoader(
    webpackThis,
    source.replace('---', '---\ndescription: A custom description\nnextjs:\n  metadata:\n    title: Metadata title\n    alternates:\n      canonical: /test\n  revalidate: 3600')
  );

  expect(evaluate(output, webpackThis.resourcePath)).toEqual({
    default: expect.any(Function),
    getMarkdown: expect.any(Function),
    metadata: {title: 'Metadata title', description: 'A custom description', alternates: {canonical: '/test'}},
    revalidate: 3600,
  });
  expect(output).toContain('export const revalidate = 3600;');
  expect(output).not.toContain('export const markdoc');
  expect(await evaluate(output, webpackThis.resourcePath).default({})).toEqual(
    React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
  );
});

test.each([
  ['{}', {title: 'Custom title', description: 'A custom description'}],
  ['{title: null, description: ""}', {title: null, description: ''}],
  ['null', null],
])('respects explicit metadata %s with flat defaults', async (metadata, expected) => {
  const context = options({appDir: true});
  const output = await callLoader(context, source.replace('---', `---\ndescription: A custom description\nnextjs:\n  metadata: ${metadata}`));
  expect(evaluate(output, context.resourcePath).metadata).toEqual(expected);
});

test.each([
  '# Hello',
  '---\nnull\n---\n# Hello',
  '---\nauthor: Someone\n---\n# Hello',
])('omits metadata when no metadata fields are supplied: %s', async (source) => {
  const context = options({appDir: true});
  const output = await callLoader(context, source);
  expect(evaluate(output, context.resourcePath)).toEqual({
    default: expect.any(Function),
    getMarkdown: expect.any(Function),
  });
});

test('can exclude metadata from configured Next.js exports', async () => {
  const context = options({appDir: true, nextjsExports: ['revalidate']});
  const output = await callLoader(context, source.replace('---', '---\nnextjs:\n  metadata:\n    title: Metadata title\n  revalidate: 0'));
  expect(evaluate(output, context.resourcePath)).toEqual({
    default: expect.any(Function),
    getMarkdown: expect.any(Function),
    revalidate: 0,
  });
});

test('supports configured static Next.js exports', async () => {
  const context = options({appDir: true, nextjsExports: ['metadata', 'dynamic', 'runtime']});
  const output = await callLoader(context, '---\nnextjs:\n  dynamic: force-static\n  runtime: nodejs\n---\n# Hello');
  expect(evaluate(output, context.resourcePath)).toEqual({
    default: expect.any(Function),
    getMarkdown: expect.any(Function),
    dynamic: 'force-static',
    runtime: 'nodejs',
  });
  expect(output).toContain('export const dynamic = "force-static";');
  expect(output).not.toContain('export const metadata');
});

test.each(['app', 'src/app'])('supports native route files in %s under a monorepo', async (directory) => {
  const context = options({appDir: true});
  const appDir = path.join(__dirname, 'apps', 'docs', directory);
  const originalOptions = context.getOptions();
  context.getOptions = () => ({...originalOptions, appDir});
  context.resourcePath = path.join(appDir, '(docs)', 'faq', 'page.md');
  const output = await callLoader(context, source);
  expect(output).toContain('const filepath = "/(docs)/faq/page.md";');
  expect(await evaluate(output, context.resourcePath).default({})).toEqual(
    React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
  );
});

test.each(['test/content.md', '_components/table.md', '../app-content/page.md'])(
  'keeps colocated content %s as a synchronous component', async (filename) => {
    const context = options({appDir: true});
    context.resourcePath = path.join(context.getOptions().appDir, filename);
    const output = await callLoader(context, source.replace('---', '---\nnextjs:\n  metadata:\n    title: Not a route'));
    const component = evaluate(output, context.resourcePath);
    expect(component.metadata).toBeUndefined();
    expect(component.markdoc.frontmatter.title).toBe('Custom title');
    expect(component.default({})).toEqual(
      React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
    );
  }
);

test('keeps Pages Router data fetching when both routers exist', async () => {
  const context = options();
  const originalOptions = context.getOptions();
  context.getOptions = () => ({...originalOptions, appDir: path.join(__dirname, 'app')});
  const output = await callLoader(context, source);
  const page = evaluate(output, context.resourcePath);
  expect(page.getStaticProps).toEqual(expect.any(Function));
  expect((await page.getStaticProps({})).props.markdoc.file.path).toBe('/test/index.md');
  expect(output).not.toContain('export const metadata');
});

test.each([
  [undefined, undefined],
  ['./schemas/folders', 'markdoc1'],
  ['./schemas/folders/', 'markdoc1'],
  ['./schemas/files', 'markdoc2'],
  ['schemas/files', 'markdoc2'],
  ['schemas/typescript', source],
])('Custom schema path ("%s")', async (schemaPath, expectedChild) => {
  const webpackThis = options({schemaPath});
  const output = await callLoader(webpackThis, source);

  const page = evaluate(output, webpackThis.resourcePath);

  const data = await page.getStaticProps({});
  expect(data.props.markdoc.content.children[0].children[0]).toEqual('Custom title');
  expect(data.props.markdoc.content.children[1]).toEqual(expectedChild);
});

test('Partials', async () => {
  const webpackThis = options({schemaPath: './schemas/partials'});
  const output = await callLoader(
    webpackThis,
    `${source}\n{% partial file="footer.md" /%}`
  );

  const page = evaluate(output, webpackThis.resourcePath);

  const data = await page.getStaticProps({});
  expect(data.props.markdoc.content.children[1].children[0]).toEqual('footer');
});

test('Ejected config', async () => {
  const webpackThis = options({schemaPath: './schemas/ejectedConfig'});
  const output = await callLoader(
    webpackThis,
    `${source}\n{% $product %}`
  );

  const page = evaluate(output, webpackThis.resourcePath);

  const data = await page.getStaticProps({});
  expect(data.props.markdoc.content.children[1]).toEqual('Extra value');
  expect(data.props.markdoc.content.children[2].children[0]).toEqual('meal');
});

test('falls back to relative schema imports when bare specifiers fail', async () => {
  const schemaDir = path.resolve(__dirname, 'schemas/files');
  const resolveRequests = [];
  const webpackThis = {
    ...options({schemaPath: './schemas/files'}),
  };

  webpackThis.getResolve = () => async (_context, request) => {
    resolveRequests.push(request);
    const target = {
      './tags': path.join(schemaDir, 'tags.js'),
      './nodes': path.join(schemaDir, 'nodes.js'),
      config: path.join(schemaDir, 'config.js'),
      './config': path.join(schemaDir, 'config.js'),
      functions: path.join(schemaDir, 'functions.js'),
      './functions': path.join(schemaDir, 'functions.js'),
    }[request];

    if (target) {
      return normalizeAbsolutePath(target);
    }

    throw new Error(`Unable to resolve "${request}"`);
  };

  const output = await callLoader(webpackThis, source);

  expect(resolveRequests).toEqual(
    expect.arrayContaining(['tags', './tags', 'nodes', './nodes'])
  );

  const importMatch = output.match(/import \* as tags from '([^']+)'/);
  expect(importMatch?.[1].startsWith('.')).toBe(true);
});

const markdownSource = `# Hello **world**

{% callout %}
Read {% badge %}this{% /badge %}.
{% /callout %}

\`\`\`js
const x = 1;
\`\`\`
`;

test('app router pages render standard nodes as Markdown', async () => {
  const context = options({appDir: true, schemaPath: './schemas/markdown'});
  const output = await callLoader(context, markdownSource);
  const page = evaluate(output, context.resourcePath);

  // Component nodes fall back to Markdoc's nodes; components without handlers render children
  expect(await page.getMarkdown()).toEqual(
    '# Hello **world**\n\nRead `this`.\n\n```js\nconst x = 1;\n```\n'
  );
});

test('app router pages use Markdown handlers from the schema', async () => {
  const context = options({appDir: true, schemaPath: './schemas/markdownHandlers'});
  const output = await callLoader(context, markdownSource);
  const page = evaluate(output, context.resourcePath);

  expect(await page.getMarkdown()).toEqual(
    '## Hello **world**\n\n> Read `this`.\n\n```js\nconst x = 1;\n```\n'
  );
});

test('Pages Router pages are not served as Markdown', async () => {
  const output = await callLoader(options(), source);
  expect(output).not.toContain('export async function getMarkdown');
});

function markdownRouteContext(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdoc-route-'));
  const appDir = path.join(dir, 'app');
  for (const file of files) {
    fs.mkdirSync(path.join(appDir, path.dirname(file)), {recursive: true});
    fs.writeFileSync(path.join(appDir, file), '');
  }
  const context = options({appDir: true});
  const originalOptions = context.getOptions();
  const contextDependencies = [];
  context.getOptions = () => ({...originalOptions, dir, appDir});
  context.addContextDependency = (directory) => contextDependencies.push(directory);
  context.resourcePath = path.join(appDir, 'markdoc', '[[...path]]', 'route.md');
  return {context, dir, appDir, contextDependencies};
}

test('route.md compiles to a route serving every page as Markdown', async () => {
  const {context, dir, appDir, contextDependencies} = markdownRouteContext([
    'markdoc/[[...path]]/route.md',
    'page.md',
    'docs/getting-started/page.md',
    'docs/faq/page.mdoc',
    '(marketing)/pricing/page.md',
    'docs/page.js',
    'docs/notes.md',
    '_drafts/page.md',
    'blog/[slug]/page.md',
    '@modal/login/page.md',
    'feed/(.)photo/page.md',
  ]);
  try {
    const output = await callLoader(context, '');
    expect(contextDependencies).toEqual([appDir]);
    expect(output).toContain(
      '"/docs/getting-started": () => import("../../docs/getting-started/page.md"),'
    );

    const route = evaluate(output, context.resourcePath);
    // Pages added during development must resolve without restarting
    expect(route.dynamicParams).toBe(true);
    expect(route.generateStaticParams()).toEqual([
      {path: ['pricing']},
      {path: ['docs', 'faq']},
      {path: ['docs', 'getting-started']},
      {path: []},
    ]);

    const missing = await route.GET(new Request('http://localhost/markdoc/nope'), {
      params: Promise.resolve({path: ['nope']}),
    });
    expect(missing.status).toBe(404);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Windows forbids < and > in file names, so these page paths cannot exist there
test.skipIf(process.platform === 'win32')('route.md escapes page paths that would end a script or a string', async () => {
  const {context, dir} = markdownRouteContext(['<script>/page.md', 'line\u2028break/page.md']);
  try {
    const output = await callLoader(context, '');
    expect(output.slice(0, output.indexOf('};'))).not.toMatch(/<|[^=]>|\u2028/);
    expect(output).toContain('"/\\u003Cscript\\u003E": () => import("../../\\u003Cscript\\u003E/page.md"),');

    const route = evaluate(output, context.resourcePath);
    expect(route.generateStaticParams()).toEqual([
      {path: ['<script>']},
      {path: ['line\u2028break']},
    ]);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('Markdown route files outside markdoc/[[...path]] compile as Markdoc', async () => {
  const {context, dir, appDir} = markdownRouteContext(['docs/page.md']);
  try {
    context.resourcePath = path.join(appDir, 'docs', 'route.md');
    const output = await callLoader(context, '# Hi');
    expect(output).not.toContain('generateStaticParams');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('HMR', async () => {
  const output = await callLoader(
    {
      ...options(),
      hot: true,
    },
    source
  );

  expect(normalizeOperatingSystemPaths(output)).toMatchSnapshot();
});

test('mode="server"', async () => {
  const webpackThis = options({mode: 'server'});
  const output = await callLoader(webpackThis, source);

  expect(evaluate(output, webpackThis.resourcePath)).toEqual({
    default: expect.any(Function),
    getServerSideProps: expect.any(Function),
    markdoc: {
      frontmatter: {
        title: 'Custom title',
      },
    },
  });
});

test('import as frontend component', async () => {
  const o = options();
  // Use a non-page pathway (join with OS-native separators so the replace
  // also matches the backslash resourcePath on Windows)
  o.resourcePath = o.resourcePath.replace(
    path.join('pages', 'test', 'index.md'),
    path.join('components', 'table.md')
  );
  const output = await callLoader(o, source);

  expect(normalizeOperatingSystemPaths(output)).toMatchSnapshot();
});

test('Turbopack configuration', () => {
  const withMarkdoc = require('../dist/index.js');

  // Test basic Turbopack configuration
  const config = withMarkdoc()({
    pageExtensions: ['js', 'md', 'mdoc'],
    turbopack: {
      rules: {},
    },
  });

  expect(config.turbopack).toBeDefined();
  expect(config.turbopack.rules).toBeDefined();
  expect(config.turbopack.rules['*.md']).toBeDefined();
  expect(config.turbopack.rules['*.mdoc']).toBeDefined();

  // Verify rule structure
  const mdRule = config.turbopack.rules['*.md'];
  expect(mdRule.loaders).toHaveLength(1);
  expect(mdRule.loaders[0].loader).toContain('loader');
  expect(mdRule.as).toBe('*.js');
  expect(JSON.parse(JSON.stringify(mdRule.loaders[0].options))).toEqual(mdRule.loaders[0].options);

  // Test that existing turbopack config is preserved
  const configWithExisting = withMarkdoc()({
    pageExtensions: ['js', 'md'],
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  });

  expect(configWithExisting.turbopack.rules['*.svg']).toBeDefined();
  expect(configWithExisting.turbopack.rules['*.md']).toBeDefined();

  // Test custom extension
  const configWithCustomExt = withMarkdoc({
    extension: /\.(markdown|mdx)$/,
  })({
    pageExtensions: ['js', 'markdown', 'mdx'],
    turbopack: {
      rules: {},
    },
  });

  expect(configWithCustomExt.turbopack.rules['*.markdown']).toBeDefined();
  expect(configWithCustomExt.turbopack.rules['*.mdx']).toBeDefined();
  expect(configWithCustomExt.turbopack.rules['*.markdown'].loaders[0].options).not.toHaveProperty('extension');
});

test.each(['', 'src'])('discovers router directories for Turbopack and Webpack in %s', (prefix) => {
  const withMarkdoc = require('../dist/index.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdoc-next-'));
  try {
    const appDir = path.join(dir, prefix, 'app');
    const pagesDir = path.join(dir, prefix, 'pages');
    fs.mkdirSync(appDir, {recursive: true});
    fs.mkdirSync(pagesDir, {recursive: true});
    const config = withMarkdoc({dir})({turbopack: {}});
    const expected = {dir, appDir, pagesDir, extensions: ['md', 'mdoc']};
    expect(config.turbopack.rules['*.md'].loaders[0].options).toEqual(expected);
    const webpack = config.webpack({module: {rules: []}}, {
      dir,
      defaultLoaders: {babel: {loader: 'babel-loader'}},
    });
    const [appRule, fallbackRule] = webpack.module.rules[0].oneOf;
    expect(appRule.include).toBe(`${appDir}${path.sep}`);
    expect(appRule.use).toHaveLength(1);
    expect(appRule.use[0].options).toEqual(expected);
    expect(fallbackRule.use[0]).toEqual({loader: 'babel-loader'});
    expect(fallbackRule.use[1].options).toEqual(expected);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test.each([
  [/\.md$/, ['*.md', '*.mdoc']],
  [/\.()$/, ['*.md', '*.mdoc']],
  [/\.()\.(markdown|mdx)$/, ['*.markdown', '*.mdx']],
  ['*.markdown', ['*.markdown']],
])('Turbopack extension patterns for %s', (extension, expected) => {
  const withMarkdoc = require('../dist/index.js');
  const config = withMarkdoc({extension})({turbopack: {}});
  expect(Object.keys(config.turbopack.rules)).toEqual(expected);
});

test('Turbopack handles long pattern sources without a closing group', () => {
  const withMarkdoc = require('../dist/index.js');
  const extension = /\.md$/;
  Object.defineProperty(extension, 'source', {
    value: '\\.(' + '\\.(('.repeat(25000),
  });
  const config = withMarkdoc({extension})({turbopack: {}});
  expect(Object.keys(config.turbopack.rules)).toEqual(['*.md', '*.mdoc']);
});

afterAll(() => {
  consoleErrorMock.mockRestore();
  consoleDebugMock.mockRestore();
});
