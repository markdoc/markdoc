import type { Node, Config, Schema } from '../types';

export const partial: Schema = {
  selfClosing: true,
  attributes: {
    file: { type: String, render: false, required: true },
    variables: { type: Object, render: false },
  },

  transform(node: Node, config: Config) {
    const { partials = {} } = config;
    const { file, variables } = node.attributes;
    const partial: Node | Node[] = partials[file];

    if (!partial) return null;

    const scopedConfig = {
      ...config,
      variables: {
        ...config.variables,
        ...variables,
        ['$$partial:filename']: file,
      },
    };

    const transformChildren = (part: Node) =>
      part.resolve(scopedConfig).transformChildren(scopedConfig);

    return Array.isArray(partial)
      ? partial.flatMap(transformChildren)
      : transformChildren(partial);
  },
};
