import type { MarkdocNextJsSchema } from '@markdoc/next.js';
import { link } from '@markdoc/next.js/tags';

import { AppLink } from '../../components/AppLink';

export default {
  ...link,
  render: AppLink
} satisfies MarkdocNextJsSchema;
