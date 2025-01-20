import Ast from './src/ast';
import Node from './src/ast/node';
import format from './src/formatter';
import functions from './src/functions';
import parser from './src/parser';
import * as nodes from './src/schema';
import renderers from './src/renderers';
import Tag from './src/tag';
import tags from './src/tags';
import { truthy } from './src/tags/conditional';
import Tokenizer from './src/tokenizer';
import transformer, { globalAttributes } from './src/transformer';
import transforms from './src/transforms';
import { parseTags } from './src/utils';
import validator, { validateTree } from './src/validator';

import type { ParserArgs } from './src/types';
import type Token from 'markdown-it/lib/token';
import type { Config, RenderableTreeNode, ValidateError } from './src/types';

export * from './src/types';

const tokenizer = new Tokenizer();

function mergeConfig(config: Config = {}): Config {
  return {
    ...config,
    tags: {
      ...tags,
      ...config.tags,
    },
    nodes: {
      ...nodes,
      ...config.nodes,
    },
    functions: {
      ...functions,
      ...config.functions,
    },
  };
}

export function parse(
  content: string | Token[],
  args?: string | ParserArgs
): Node {
  if (typeof content === 'string') content = tokenizer.tokenize(content);
  return parser(content, args);
}

export function resolve<C extends Config = Config>(
  content: Node,
  config: C
): Node;
export function resolve<C extends Config = Config>(
  content: Node[],
  config: C
): Node[];
export function resolve<C extends Config = Config>(
  content: any,
  config: C
): any {
  if (Array.isArray(content))
    return content.flatMap((child) => child.resolve(config));

  return content.resolve(config);
}

export function transform<C extends Config = Config>(
  node: Node,
  config?: C
): RenderableTreeNode;
export function transform<C extends Config = Config>(
  nodes: Node[],
  config?: C
): RenderableTreeNode[];
export function transform<C extends Config = Config>(
  nodes: any,
  options?: C
): any {
  const config = mergeConfig(options);
  const content = resolve(nodes, config);

  if (Array.isArray(content))
    return content.flatMap((child) => child.transform(config));
  return content.transform(config);
}

export function validate<C extends Config = Config>(
  node: Node,
  options?: C
): ValidateError[];
export function validate<C extends Config = Config>(
  content: any,
  options?: C
): any {
  const config = mergeConfig(options);
  return validateTree(content, config);
}

export function createElement(
  name: string | { key?: string | number },
  attributes = {},
  ...children: any[]
) {
  return { name, attributes, children };
}

export {
  nodes,
  tags,
  functions,
  globalAttributes,
  transforms,
  renderers,
  Ast,
  Node,
  Tag,
  Tokenizer,
  parseTags,
  transformer,
  validator,
  truthy,
  format,
};

export default class Markdoc {
  static nodes = nodes;
  static tags = tags;
  static functions = functions;
  static globalAttributes = globalAttributes;
  static renderers = renderers;
  static transforms = transforms;
  static Ast = Ast;
  static Tag = Tag;
  static Tokenizer = Tokenizer;
  static parseTags = parseTags;
  static transformer = transformer;
  static validator = validator;
  static parse = parse;
  static transform = transform;
  static validate = validate;
  static createElement = createElement;
  static truthy = truthy;
  static format = format;

  config;
  constructor(config: Config) {
    this.config = config;
  }

  parse = parse;
  resolve = (content: Parameters<typeof resolve>[0]) =>
    resolve(content, this.config);
  transform = (content: Parameters<typeof transform>[0]) =>
    transform(content, this.config);
  validate = (content: Parameters<typeof validate>[0]) =>
    validate(content, this.config);
}
