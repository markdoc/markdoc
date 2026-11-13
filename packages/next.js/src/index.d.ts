import type {ElementType} from 'react';
import type {NextConfig} from 'next';
import type {Config, RenderableTreeNodes, Schema} from '@markdoc/markdoc';
import type {RuleSetConditionAbsolute} from 'webpack';

export type MarkdocNextJsPageProps = {
  markdoc?: {
    content: RenderableTreeNodes;
    frontmatter: Record<string, any>;
    file: {
      path: string;
    };
  };
};

export type MarkdocNextJsConfig = Config & {readonly source: string};

export type MarkdocNextJsSchema<O extends Object = {}> = Schema<
  O & MarkdocNextJsConfig,
  ElementType
>;

export interface MarkdocNextJsOptions {
  extension?: RuleSetConditionAbsolute;
  mode?: 'static' | 'server';
  options?: {
    slots?: boolean;
    allowComments?: boolean;
  };
  schemaPath?: string;
  dir?: string;
}

declare function createMarkdocPlugin(
  options?: MarkdocNextJsOptions
): (config: NextConfig) => NextConfig;

export = createMarkdocPlugin;
