const vm = require('vm');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');
const React = require('react');
const enhancedResolve = require('enhanced-resolve');
const loader = require('../src/loader');

// Mock the runtime module using Jest
jest.mock('@markdoc/next.js/runtime', () => require('../src/runtime'), {virtual: true});

const source = fs.readFileSync(require.resolve('./fixture.md'), 'utf-8');
const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleDebugMock = jest.spyOn(console, 'debug').mockImplementation(() => {});

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
    resourcePath: path.join(dir, 'test', 'index.md'),
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
    markdoc: {
      frontmatter: {
        title: 'Custom title',
      },
    },
  });

  expect(await page.default({})).toEqual(
    React.createElement('article', undefined, React.createElement('h1', undefined, 'Custom title'))
  );
});

test('app router metadata', async () => {
  const webpackThis = options({appDir: true});
  const output = await callLoader(
    webpackThis,
    source.replace('---', '---\nmetadata:\n  title: Metadata title')
  );

  expect(output).toContain('export const metadata = frontmatter.nextjs?.metadata;');
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
  const withMarkdoc = require('../src/index.js');

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
});

afterAll(() => {
  consoleErrorMock.mockRestore();
  consoleDebugMock.mockRestore();
});
