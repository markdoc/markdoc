import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { Section } from '../../components/Section';

export default {
  render: Section,
  attributes: {
    className: { type: String }
  }
} satisfies MarkdocNextJsSchema;
