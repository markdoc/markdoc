const fs = require('fs');
const path = require('path');
const Markdoc = require('@markdoc/markdoc');

const DEFAULT_SCHEMA_PATH = './markdoc';

function getRelativeImportPath(from, to) {
  const relative = path.relative(path.dirname(from), to);
  if (!relative) {
    return './';
  }

  // Module specifiers must use forward slashes on all platforms.
  // Backslashes (or escaped versions) cause different loader output per OS
  // and are not treated as path delimiters by bundlers.
  const request = relative.split(path.sep).join(path.posix.sep);
  return request.startsWith('.') ? request : `./${request}`;
}

async function gatherPartials(ast, schemaDir, tokenizer, parseOptions) {
  let partials = {};

  for (const node of ast.walk()) {
    const file = node.attributes.file;

    if (
      node.type === 'tag' &&
      node.tag === 'partial' &&
      typeof file === 'string' &&
      !partials[file]
    ) {
      const filepath = path.join(schemaDir, file);
      // parsing is not done here because then we have to serialize and reload from JSON at runtime
      const content = await fs.promises.readFile(filepath, {encoding: 'utf8'});

      if (content) {
        const tokens = tokenizer.tokenize(content);
        const ast = Markdoc.parse(tokens, parseOptions);
        partials = {
          ...partials,
          [file]: content,
          ...(await gatherPartials.call(this, ast, schemaDir, tokenizer, parseOptions)),
        };
      }
    }
  }

  return partials;
}

// Returning a JSX object is what allows fast refresh to work
async function load(source) {
  // https://webpack.js.org/concepts/module-resolution/
  const resolve = this.getResolve({
    // https://webpack.js.org/api/loaders/#thisgetresolve
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx', '...'],
    preferRelative: true,
  });

  const {
    dir, // Root directory from Next.js (contains next.config.js)
    mode = 'static',
    schemaPath = DEFAULT_SCHEMA_PATH,
    options: {slots = false, ...options} = {
      allowComments: true,
    },
    nextjsExports = ['metadata', 'revalidate'],
    appDir = false,
    pagesDir,
  } = this.getOptions() || {};

  const tokenizer = new Markdoc.Tokenizer(options);
  const parseOptions = {slots};
  const schemaDir = path.resolve(dir, schemaPath || DEFAULT_SCHEMA_PATH);
  const tokens = tokenizer.tokenize(source);
  const ast = Markdoc.parse(tokens, parseOptions);

  // Determine if this is a page file by checking if it starts with the provided directories
  const isPage = (appDir && this.resourcePath.startsWith(appDir)) ||
                 (pagesDir && this.resourcePath.startsWith(pagesDir));

  // Grabs the path of the file relative to the `/{app,pages}` directory
  // to pass into the app props later.
  // This array access @ index 1 is safe since Next.js guarantees that
  // all pages will be located under either {app,pages}/ or src/{app,pages}/
  // https://nextjs.org/docs/app/building-your-application/configuring/src-directory
  // Normalize to posix separators for consistent output across platforms.
  // Undefined for non-page resources (e.g., .md imported as components).
  const rawFilepath = this.resourcePath.split(appDir ? 'app' : 'pages')[1];
  const filepath = rawFilepath
    ? rawFilepath.split(path.sep).join(path.posix.sep)
    : rawFilepath;

  const partials = await gatherPartials.call(
    this,
    ast,
    path.resolve(schemaDir, 'partials'),
    tokenizer,
    parseOptions
  );

  // IDEA: consider making this an option per-page
  const dataFetchingFunction = mode === 'server' ? 'getServerSideProps' : 'getStaticProps';

  let schemaCode = 'const schema = {};';
  try {
    const directoryExists = await fs.promises.stat(schemaDir);

    // This creates import strings that cause the config to be imported runtime
    const importAtRuntime = async (variable) => {
      const requests = [variable];

      // Turbopack module resolution currently requires explicit relative paths
      // when `preferRelative` is used with bare specifiers (e.g. `tags`).
      if (
        typeof variable === 'string' &&
        !variable.startsWith('.') &&
        !variable.startsWith('/')
      ) {
        requests.push(`./${variable}`);
      }

      let lastError;

      for (const request of requests) {
        try {
          const module = await resolve(schemaDir, request);
          const modulePath = getRelativeImportPath(this.resourcePath, module);
          return `import * as ${variable} from '${modulePath}'`;
        } catch (error) {
          lastError = error;
        }
      }

      console.debug('[Markdoc loader] Failed to resolve', { schemaDir, variable, error: lastError });
      return `const ${variable} = {};`;
    };

    if (directoryExists) {
      schemaCode = `
        ${await importAtRuntime('config')}
        ${await importAtRuntime('tags')}
        ${await importAtRuntime('nodes')}
        ${await importAtRuntime('functions')}
        const schema = {
          tags: defaultObject(tags),
          nodes: defaultObject(nodes),
          functions: defaultObject(functions),
          ...defaultObject(config),
        };`
        .trim()
        .replace(/^\s+/gm, '');
    }
  } catch (error) {
    // Only throw module not found errors if user is passing a custom schemaPath
    if (schemaPath && schemaPath !== DEFAULT_SCHEMA_PATH) {
      throw new Error(`Cannot find module '${schemaPath}' at '${schemaDir}'`);
    }
  }

  this.addContextDependency(schemaDir);

  const nextjsExportsCode = nextjsExports
    .map((name) => `export const ${name} = frontmatter.nextjs?.${name};`)
    .join('\n');

  const result = `import React from 'react';
import yaml from 'js-yaml';
// renderers is imported separately so Markdoc isn't sent to the client
import Markdoc, {renderers} from '@markdoc/markdoc'

import {getSchema, defaultObject} from '@markdoc/next.js/runtime';
/**
 * Schema is imported like this so end-user's code is compiled using build-in babel/webpack configs.
 * This enables typescript/ESnext support
 */
${schemaCode}

const tokenizer = new Markdoc.Tokenizer(${options ? JSON.stringify(options) : ''});

/**
 * Source will never change at runtime, so parse happens at the file root
 */
const source = ${JSON.stringify(source)};
const filepath = ${JSON.stringify(filepath)};
const tokens = tokenizer.tokenize(source);
const parseOptions = ${JSON.stringify(parseOptions)};
const ast = Markdoc.parse(tokens, parseOptions);

/**
 * Like the AST, frontmatter won't change at runtime, so it is loaded at file root.
 * This unblocks future features, such a per-page dataFetchingFunction.
 */
const frontmatter = ast.attributes.frontmatter
  ? yaml.load(ast.attributes.frontmatter)
  : {};

const {components, ...rest} = getSchema(schema)

${isPage ? 'async ' : ''}function getMarkdocData(context = {}) {
  const partials = ${JSON.stringify(partials)};

  // Ensure Node.transformChildren is available
  Object.keys(partials).forEach((key) => {
    const tokens = tokenizer.tokenize(partials[key]);
    partials[key] = Markdoc.parse(tokens, parseOptions);
  });

  const cfg = {
    ...rest,
    variables: {
      ...(rest ? rest.variables : {}),
      // user can't override this namespace
      markdoc: {frontmatter},
      // Allows users to eject from Markdoc rendering and pass in dynamic variables via getServerSideProps
      ...(context.variables || {})
    },
    partials,
    source,
  };

  /**
   * transform must be called in dataFetchingFunction to support server-side rendering while
   * accessing variables on the server
   */
  const content = ${isPage ? 'await ' : ''}Markdoc.transform(ast, cfg);

  // Removes undefined
  return JSON.parse(
    JSON.stringify({
      content,
      frontmatter,
      file: {
        path: filepath,
      },
    })
  );
}

${
  appDir || !isPage
    ? ''
    : `export async function ${dataFetchingFunction}(context) {
  return {
    props: {
      markdoc: await getMarkdocData(context),
    },
  };
}`
}
${appDir && isPage ? nextjsExportsCode : ''}
export const markdoc = {frontmatter};
export default${appDir && isPage ? ' async' : ''} function MarkdocComponent(props) {
  const markdoc = ${
    isPage ? (appDir ? 'await getMarkdocData()' : 'props.markdoc') : 'getMarkdocData()'
  };
  // Only execute HMR code in development
  return renderers.react(markdoc.content, React, {
    components: {
      ...components,
      // Allows users to override default components at runtime, via their _app
      ...props.components,
    },
  });
}
`;
  return result;
}

module.exports = async function loader(source) {
  const callback = this.async();
  try {
    const result = await load.call(this, source);
    callback(null, result);
  } catch (error) {
    console.error(error);
    callback(error);
  }
};
