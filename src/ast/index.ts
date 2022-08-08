import Node from './node';
import Function from './function';
import Tag from './tag';
import Variable from './variable';
import * as base from './base';

import type { AstType } from '../types';

const AstTypes = {
  Function,
  Node,
  Tag,
  Variable,
};

function reviver(_: string, value: AstType): any {
  if (!value) return value;
  const klass = AstTypes[value.$$mdtype] as any;
  return klass ? Object.assign(new klass(), value) : value;
}

function fromJSON(text: string): Node | Node[] {
  return JSON.parse(text, reviver);
}

export default {
  ...AstTypes,
  ...base,
  fromJSON,
};
