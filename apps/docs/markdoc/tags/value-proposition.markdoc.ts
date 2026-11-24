import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { TYPE_MAP } from '../../components/Ascii';
import { ValueProposition } from '../../components/ValuePropositions';

export default {
  render: ValueProposition,
  attributes: {
    icon: {
      type: String,
      required: true,
      matches: Object.keys(TYPE_MAP)
    }
  }
} satisfies MarkdocNextJsSchema;
