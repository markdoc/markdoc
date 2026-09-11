import type MarkdownIt from 'markdown-it';
import type { Token } from '../../types';

import { containsMarkdocTagInUrl } from '../../utils';
import { LinkPluginOptions } from '..';

const INVALID_HREF_MESSAGE =
  "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.";

function pushHrefError(token: Token) {
  if (!token.errors) token.errors = [];
  token.errors.push({
    id: 'href-format-invalid',
    level: 'error',
    message: INVALID_HREF_MESSAGE,
  });
}

function core(state: MarkdownIt.StateCore, options: LinkPluginOptions) {
  let token: Token;
  for (token of state.tokens) {
    if (token.type !== 'inline' || typeof token.content !== 'string') continue;

    if (containsMarkdocTagInUrl(token.content, options.validatedProtocols)) {
      pushHrefError(token);
    }
  }
}

export default function plugin(
  md: MarkdownIt.MarkdownIt,
  options: LinkPluginOptions
) {
  md.core.ruler.push('link_url_validation', (state) => core(state, options));
}
