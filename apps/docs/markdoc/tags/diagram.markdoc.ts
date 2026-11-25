import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { Diagram } from '../../components/Diagram';

export default {
  render: Diagram,
  attributes: {
    type: {
      type: String,
      required: true,
      matches: ['flowchart']
    }
  }
} satisfies MarkdocNextJsSchema;
