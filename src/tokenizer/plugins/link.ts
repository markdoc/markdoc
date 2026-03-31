import type MarkdownIt from 'markdown-it/lib';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type Token from 'markdown-it/lib/token';
import type { ValidationError } from '../../types';

import { TAG_PATTERN } from '../../utils';

const MARKDOWN_LINK_DESTINATION = /\[[^\]]+\]\(([^)\n]+)\)/g;
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

function core(state: StateCore) {
  let token: Token;
  for (token of state.tokens) {
    if (token.type !== 'inline' || typeof token.content !== 'string') continue;

    const matches = token.content.match(MARKDOWN_LINK_DESTINATION) || [];
    const invalidLink = matches.find((linkSource) =>
      TAG_PATTERN.test(linkSource)
    );
    if (!invalidLink) continue;

    pushHrefError(token);
  }
}

export default function plugin(md: MarkdownIt) {
  md.core.ruler.push('link_url_validation', core);
}
