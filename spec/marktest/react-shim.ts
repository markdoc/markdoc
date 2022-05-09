type ReactNode = {
  tag?: string;
  attributes?: { [key: string]: any };
  children?: ReactNode[];
};

export default {
  Fragment: 'Fragment',
  createElement(tag, attributes, ...children) {
    const output: ReactNode = {};

    if (tag) output.tag = tag;

    if (attributes) output.attributes = attributes;

    if (children.length) output.children = children.flat(Infinity);

    return output;
  },
};
