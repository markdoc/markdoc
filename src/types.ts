import type Func from './ast/function';
import type Node from './ast/node';
import type Tag from './ast/tag';

export type { Node, Tag };
export declare type Function = Func;

export interface AstType {
  readonly $$mdtype: 'Function' | 'Node' | 'Variable';
  resolve(config: Config): any;
}

export type AttributeValue = {
  type: string;
  name: string;
  value: any;
};

export type Config = Readonly<ConfigType>;

export type ConfigType = Partial<{
  nodes: Partial<Record<NodeType, Schema>>;
  tags: Record<string, Schema>;
  variables: Record<string, any>;
  functions: Record<string, ConfigFunction>;
  partials: Record<string, any>;
  validation?: {
    validateFunctions?: boolean;
  };
  transformer: Transformer;
}>;

export type ConfigFunction = {
  returns?: ValidationType | ValidationType[];
  parameters?: Record<string, SchemaAttribute>;
  transform?(parameters: Record<string, any>, config: Config): any;
  validate?(fn: Func, config: Config): ValidationError[];
};

export interface CustomAttributeTypeInterface {
  transform?(value: any, config: Config): Scalar;
  validate?(value: any, config: Config): ValidationError[];
}

export interface CustomAttributeType {
  new (): CustomAttributeTypeInterface;
  readonly prototype: CustomAttributeTypeInterface;
}

export type Location = {
  file?: string;
  start: LocationEdge;
  end: LocationEdge;
};

export type LocationEdge = {
  line: number;
  character?: number;
};

export type NodeType =
  | 'document'
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'hr'
  | 'image'
  | 'fence'
  | 'tag'
  | 'list'
  | 'item'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tr'
  | 'td'
  | 'th'
  | 'inline'
  | 'strong'
  | 'em'
  | 's'
  | 'link'
  | 'code'
  | 'text'
  | 'hardbreak'
  | 'softbreak';

export type Primitive = null | boolean | number | string;

export type RenderableTreeNode = Tag | string | null;
export type RenderableTreeNodes = RenderableTreeNode | RenderableTreeNode[];

export type Scalar = Primitive | Scalar[] | { [key: string]: Scalar };

export type Schema<C extends Config = Config, R = string> = {
  render?: R;
  children?: string[];
  attributes?: Record<string, SchemaAttribute>;
  selfClosing?: boolean;
  transform?(node: Node, config: C): RenderableTreeNodes;
  validate?(node: Node, config: C): ValidationError[];
};

export type SchemaAttribute = {
  type?: ValidationType | ValidationType[];
  render?: boolean | string;
  default?: any;
  required?: boolean;
  matches?: SchemaMatches | ((config: Config) => SchemaMatches);
  errorLevel?: ValidationError['level'];
};

export type SchemaMatches = RegExp | string[] | null;

export interface Transformer {
  findSchema(node: Node, config: Config): Schema | undefined;
  node(node: Node, config: Config): RenderableTreeNodes;
  attributes(node: Node, config: Config): Record<string, any>;
  children(node: Node, config: Config): RenderableTreeNode[];
}

export type ValidationError = {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location?: Location;
};

export type ValidateError = {
  type: string;
  lines: number[];
  location?: Location;
  error: ValidationError;
};

export type ValidationType =
  | CustomAttributeType
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Object'
  | 'Array';

export type Value = AstType | Scalar;
