import { Tag } from '@markdoc/markdoc';
import { Code } from '../../components/Code';

export default {
  render: Code,
  attributes: {},
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const { content, language } = node.children[0].attributes;

    return new Tag(this.render, { ...attributes, language }, [content]);
  }
};
