import type { MarkdocNextJsSchema } from '@markdoc/next.js';
/**
 * Note: we define a custom `document` type here in order to pass the
 * raw Markdoc source text to the interactive document editor. This is an
 * atypical pattern for Markdoc applications.
 */
import { Tag, nodes } from '@markdoc/markdoc';
import { Document } from '../../components/Document';

export default {
  ...nodes.document,
  render: Document,
  transform(node, config) {
    return new Tag(
      this.render as string,
      { source: config.source },
      node.transformChildren(config)
    );
  }
} satisfies MarkdocNextJsSchema;
