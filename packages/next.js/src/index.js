function createTurbopackConfig(nextConfig, pluginOptions) {
  const turbopack = nextConfig.turbopack;

  if (!turbopack) {
    return;
  }

  const extension = pluginOptions.extension || /\.(md|mdoc)$/;

  // Extract file extensions from regex pattern like /\.(md|mdoc)$/ to create glob patterns for Turbopack
  const extensionPatterns =
    extension instanceof RegExp
      ? extension.source
          .match(/\\\.\(([^)]+)\)\$?/)?.[1]
          ?.split('|')
          .map((e) => `*.${e}`) || ['*.md', '*.mdoc']
      : [extension];

  const rules = extensionPatterns.reduce((acc, pattern) => {
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
  }, {});

  return {
    ...nextConfig.turbopack,
    rules: {
      ...nextConfig.turbopack.rules,
      ...rules,
    },
  };
}

const withMarkdoc =
  (pluginOptions = {}) =>
  (nextConfig = {}) => {
    const extension = pluginOptions.extension || /\.(md|mdoc)$/;

    return Object.assign({}, nextConfig, {
      webpack(config, options) {
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

module.exports = withMarkdoc;
