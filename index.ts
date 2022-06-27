import Tokenizer from './src/tokenizer';
import parser from './src/parser';
import Node from './src/ast/node';
import Tag from './src/ast/tag';
import Ast from './src/ast/index';
import * as nodes from './src/schema';
import tags from './src/tags/index';
import { truthy } from './src/tags/conditional';
import functions from './src/functions/index';
import renderers from './src/renderers/index';
import transformer, { globalAttributes } from './src/transformer';
import validator from './src/validator';
import { parseTags } from './src/utils';
import transforms from './src/transforms/index';

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

export function parse(content: string | Token[], file?: string): Node {
  if (typeof content === 'string') content = tokenizer.tokenize(content);
  return parser(content, file);
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
  content: Node,
  options?: C
): ValidateError[] {
  const config = mergeConfig(options);

  const output = [];
  for (const node of [content, ...content.walk()]) {
    const { type, lines, location } = node;
    const errors = validator(node, config);

    for (const error of errors) output.push({ type, lines, location, error });
  }

  return output;
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
  Tag,
  Tokenizer,
  parseTags,
  transformer,
  validator,
  truthy,
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
