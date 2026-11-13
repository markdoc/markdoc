import type { ElementType } from 'react';
import type {
  Config,
  RenderableTreeNodes,
  Schema,
  Tokenizer,
} from '@markdoc/markdoc';

export type MarkdocNextJsPageProps = {
  markdoc?: {
    content: RenderableTreeNodes;
    frontmatter: Record<string, any>;
    file: { path: string };
  };
};

export type MarkdocNextJsConfig = Config & { readonly source: string };

export type MarkdocNextJsSchema<O extends object = {}> = Schema<
  O & MarkdocNextJsConfig,
  ElementType
>;

// Webpack conditions are structural so consumers do not need to install webpack
// just to resolve the plugin's public declarations.
export type ExtensionCondition =
  | string
  | RegExp
  | ((value: string) => boolean)
  | {
      and?: ExtensionCondition[];
      or?: ExtensionCondition[];
      not?: ExtensionCondition;
    }
  | ExtensionCondition[];

export interface MarkdocNextJsOptions {
  extension?: ExtensionCondition;
  mode?: 'static' | 'server';
  options?: NonNullable<ConstructorParameters<typeof Tokenizer>[0]> & {
    slots?: boolean;
  };
  schemaPath?: string;
  dir?: string;
  nextjsExports?: string[];
}

export interface LoaderOptions extends MarkdocNextJsOptions {
  dir: string;
  appDir?: string | false;
  pagesDir?: string;
}

// The subset of the loader API used by both Webpack and Turbopack.
export interface LoaderContext {
  resourcePath: string;
  getOptions(): LoaderOptions;
  getResolve(options: {
    extensions: string[];
    preferRelative: boolean;
  }): (context: string, request: string) => Promise<string | false>;
  addContextDependency(directory: string): void;
  async(): (error: Error | null, source?: string) => void;
}
