import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { Icon } from '../../components/Icon';

export default {
  render: Icon,
  attributes: {
    icon: {
      type: String,
      required: true
    },
    color: {
      type: String
    }
  }
} satisfies MarkdocNextJsSchema;
