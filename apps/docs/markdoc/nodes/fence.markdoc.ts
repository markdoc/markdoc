import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { nodes } from '@markdoc/markdoc';
import { Code } from '../../components/Code';

export default {
  render: Code,
  attributes: nodes.fence.attributes
} satisfies MarkdocNextJsSchema;
