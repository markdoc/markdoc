/**
 * Note: we define a custom `document` type here in order to pass the
 * raw Markdoc source text to AST, to be consumed in _app. This is an
 * atypical pattern for Markdoc applications.
 */
import { Tag, nodes } from '@markdoc/markdoc';
import { Document } from '../../components/Document';

export default {
  ...nodes.document,
  render: Document,
  transform(node, config) {
    return new Tag(
      this.render,
      { source: config.source },
      node.transformChildren(config)
    );
  }
};
