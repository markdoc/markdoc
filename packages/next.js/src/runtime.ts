import { nodes } from '@markdoc/markdoc';
import type { Config, NodeType, Schema } from '@markdoc/markdoc';

export type SchemaConfig<R> = Omit<Config, 'tags' | 'nodes'> & {
  tags?: Record<string, Schema<Config, R>>;
  nodes?: Partial<Record<NodeType, Schema<Config, R>>>;
};

type Renderers<T> =
  T extends Record<string, infer S>
    ? S extends { render?: infer R }
      ? R
      : never
    : never;

// Pascal case, keeping the capitals of camelCase names such as `sideBySide`
function displayName(name: string): string {
  return name
    .match(/[a-z]+/gi)!
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function transformRecord<R>(config?: Record<string, Schema<Config, R>>) {
  const output: Record<string, Schema> = {};
  const components: Record<string, R> = {};

  if (config) {
    Object.entries(config).forEach(([name, registration]) => {
      if (output[name]) {
        throw new Error(`"${name}" has already been declared`);
      }

      const componentName = registration.render ? displayName(name) : undefined;

      output[name] = {
        ...registration,
        render: componentName,
      };

      if (componentName && registration.render) {
        components[componentName] = registration.render;
      }
    });
  }

  return { output, components };
}

export function getSchema<T extends SchemaConfig<unknown>>(
  schema: T
): Omit<T, 'tags' | 'nodes' | 'components'> & {
  tags: Record<string, Schema>;
  nodes: Record<string, Schema>;
  components: Record<string, Renderers<T['tags']> | Renderers<T['nodes']>>;
};
export function getSchema(schema: SchemaConfig<unknown>) {
  const { output: tags, components: tagComponents } = transformRecord(
    schema.tags
  );

  const { output: nodes, components: nodeComponents } = transformRecord(
    schema.nodes
  );

  return {
    ...schema,
    tags,
    nodes,
    components: {
      ...tagComponents,
      ...nodeComponents,
    },
  };
}

function markdownRecord<R>(
  config: Record<string, Schema<Config, R>> | undefined,
  fallback: (name: string) => Schema | undefined
) {
  const output: Record<string, Schema> = {};

  if (config) {
    Object.entries(config).forEach(([name, registration]) => {
      // Element names such as 'code' are standard elements to the Markdown renderer
      if (typeof registration.render === 'string' || !registration.render) {
        output[name] = registration as Schema;
        return;
      }

      output[name] = fallback(name) || {
        ...registration,
        render: displayName(name),
      };
    });
  }

  return output;
}

/**
 * Returns the schema used to render Markdown. Nodes rendered by components use
 * Markdoc's standard node, so headings, code blocks and links stay standard Markdown,
 * unless a Markdown handler is registered for the component.
 */
export function getMarkdownSchema(
  schema: SchemaConfig<unknown>,
  handlers: Record<string, unknown> = {}
): Omit<SchemaConfig<unknown>, 'tags' | 'nodes'> & {
  tags: Record<string, Schema>;
  nodes: Record<string, Schema>;
} {
  const handled = (name: string) =>
    Object.prototype.hasOwnProperty.call(handlers, displayName(name));

  return {
    ...schema,
    tags: markdownRecord(schema.tags, () => undefined),
    nodes: markdownRecord(schema.nodes, (name) =>
      !handled(name) && Object.prototype.hasOwnProperty.call(nodes, name)
        ? (nodes as Record<string, Schema>)[name]
        : undefined
    ),
  };
}

export function defaultObject<T>(o: { default: T }): T;
export function defaultObject<T extends object>(o: T): T;
export function defaultObject(o: unknown): unknown {
  if (Object.prototype.hasOwnProperty.call(o, 'default')) {
    return (o as { default: unknown }).default;
  }
  return o || {};
}
