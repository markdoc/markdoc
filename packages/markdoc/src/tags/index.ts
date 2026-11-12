import { tagIf, tagElse } from './conditional';
import { partial } from './partial';
import { table } from './table';
import { slot } from './slot';

export default {
  else: tagElse,
  if: tagIf,
  partial,
  slot,
  table,
};
