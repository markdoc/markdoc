import { link } from '@markdoc/next.js/tags';

import { AppLink } from '../../components/AppLink';

export default {
  ...link,
  render: AppLink
};
