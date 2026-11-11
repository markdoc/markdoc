import type { AstType } from '../types';
import * as base from './base';
import Function from './function';
import Node from './node';
import Variable from './variable';

const AstTypes = {
  Function,
  Node,
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
