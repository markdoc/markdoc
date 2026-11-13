import type { NextConfig } from 'next';
import type * as Types from './types';

type WebpackHook = NonNullable<NextConfig['webpack']>;
type TurbopackRule = {
  loaders: { loader: string; options: Types.MarkdocNextJsOptions }[];
  as: string;
};

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
            options: {
              ...pluginOptions,
            },
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
        config.module.rules.push({
          test: extension,
          use: [
            // Adding the babel loader enables fast refresh
            options.defaultLoaders.babel,
            {
              loader: require.resolve('./loader'),
              options: {
                appDir: options.defaultLoaders.babel.options.appDir,
                pagesDir: options.defaultLoaders.babel.options.pagesDir,
                ...pluginOptions,
                dir: options.dir,
              },
            },
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
