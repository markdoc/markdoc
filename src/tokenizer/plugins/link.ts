import type MarkdownIt from 'markdown-it/lib';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type Token from 'markdown-it/lib/token';
import type { ValidationError } from '../../types';

import { containsMarkdocTagInUrl } from '../../utils';
import { LinkPluginOptions } from '..';

const INVALID_HREF_MESSAGE =
  "The 'href' format cannot contain Markdoc tag or variable. URLs must be static strings.";

type TokenWithErrors = Token & { errors?: ValidationError[] };

function pushHrefError(token: Token) {
  const tokenWithErrors = token as TokenWithErrors;
  if (!tokenWithErrors.errors) tokenWithErrors.errors = [];
  tokenWithErrors.errors.push({
    id: 'href-format-invalid',
    level: 'error',
    message: INVALID_HREF_MESSAGE,
  });
}

function core(state: StateCore, options: LinkPluginOptions) {
  let token: Token;
  for (token of state.tokens) {
    if (token.type !== 'inline' || typeof token.content !== 'string') continue;

    if (containsMarkdocTagInUrl(token.content, options.validatedProtocols)) {
      pushHrefError(token);
    }
  }
}

export default function plugin(md: MarkdownIt, options: LinkPluginOptions) {
  md.core.ruler.push('link_url_validation', (state) => core(state, options));
}
