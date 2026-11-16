import fs = require('node:fs');
import path = require('node:path');
import type { NextConfig } from 'next';
import type * as Types from './types';

type WebpackHook = NonNullable<NextConfig['webpack']>;
type TurbopackRule = {
  loaders: { loader: string; options: Types.LoaderOptions }[];
  as: string;
};

function getLoaderOptions(
  pluginOptions: Types.MarkdocNextJsOptions,
  directory = pluginOptions.dir || process.cwd()
): Types.LoaderOptions {
  const dir = path.resolve(directory);
  const findDirectory = (name: string): string | undefined =>
    [path.join(dir, name), path.join(dir, 'src', name)].find((directory) =>
      fs.existsSync(directory)
    );

  const { extension, ...loaderOptions } = pluginOptions;
  return {
    ...Object.fromEntries(
      Object.entries({
        appDir: findDirectory('app'),
        pagesDir: findDirectory('pages'),
        ...loaderOptions,
      }).filter(([, value]) => value !== undefined)
    ),
    dir,
  };
}

function getExtensionPatterns(extension: Types.ExtensionCondition): string[] {
  if (!(extension instanceof RegExp)) return [String(extension)];

  // Find the first nonempty extension group without repeatedly scanning suffixes.
  const source = extension.source;
  let start = source.indexOf('\\.(');
  while (start !== -1) {
    const groupStart = start + 3;
    const end = source.indexOf(')', groupStart);
    if (end === -1) break;
    if (end > groupStart) {
      return source
        .slice(groupStart, end)
        .split('|')
        .map((e) => `*.${e}`);
    }
    start = source.indexOf('\\.(', end + 1);
  }

  return ['*.md', '*.mdoc'];
}

function createTurbopackConfig(
  nextConfig: NextConfig,
  pluginOptions: Types.MarkdocNextJsOptions
) {
  const turbopack = nextConfig.turbopack;

  if (!turbopack) {
    return;
  }

  const extension = pluginOptions.extension || /\.(md|mdoc)$/;

  // Extract file extensions from regex pattern like /\.(md|mdoc)$/ to create glob patterns for Turbopack
  const extensionPatterns = getExtensionPatterns(extension);

  const rules = extensionPatterns.reduce<Record<string, TurbopackRule>>(
    (acc, pattern) => {
      acc[pattern] = {
        loaders: [
          {
            loader: require.resolve('./loader'),
            options: getLoaderOptions(pluginOptions),
          },
        ],
        as: '*.js',
      };
      return acc;
    },
    {}
  );

  return {
    ...turbopack,
    rules: {
      ...turbopack.rules,
      ...rules,
    },
  };
}

function withMarkdoc(pluginOptions: Types.MarkdocNextJsOptions = {}) {
  return (nextConfig: NextConfig = {}): NextConfig => {
    const extension = pluginOptions.extension || /\.(md|mdoc)$/;

    return Object.assign({}, nextConfig, {
      webpack(
        config: Parameters<WebpackHook>[0],
        options: Parameters<WebpackHook>[1]
      ) {
        const loaderOptions = getLoaderOptions(pluginOptions, options.dir);
        const markdocLoader = {
          loader: require.resolve('./loader'),
          options: loaderOptions,
        };
        config.module.rules.push({
          test: extension,
          oneOf: [
            // The generated module is already JavaScript. Next.js applies its
            // App Router flight loader; the Pages Router compiler pass below
            // would incorrectly reject Server Component metadata exports.
            ...(loaderOptions.appDir
              ? [
                  {
                    include: `${loaderOptions.appDir}${path.sep}`,
                    use: [markdocLoader],
                  },
                ]
              : []),
            { use: [options.defaultLoaders.babel, markdocLoader] },
          ],
        });

        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options);
        }

        return config;
      },

      turbopack: createTurbopackConfig(nextConfig, pluginOptions),
    });
  };
}

namespace withMarkdoc {
  export type MarkdocNextJsPageProps = Types.MarkdocNextJsPageProps;
  export type MarkdocNextJsConfig = Types.MarkdocNextJsConfig;
  export type MarkdocNextJsSchema<O extends object = {}> =
    Types.MarkdocNextJsSchema<O>;
  export type MarkdocNextJsOptions = Types.MarkdocNextJsOptions;
}

export = withMarkdoc;
