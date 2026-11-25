import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { Features } from '../../components/Features';

export default {
  render: Features,
  attributes: {
    features: { type: Array }
  }
} satisfies MarkdocNextJsSchema;
