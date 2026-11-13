import type { Config, NodeType, Schema } from '@markdoc/markdoc';

export type SchemaConfig<R> = Omit<Config, 'tags' | 'nodes'> & {
  tags?: Record<string, Schema<Config, R>>;
  nodes?: Partial<Record<NodeType, Schema<Config, R>>>;
};

// IDEA: explore better displayName functions
function displayName(name: string): string {
  // Pascal case
  return name
    .match(/[a-z]+/gi)!
    .map((word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase())
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

export function getSchema<R>(schema: SchemaConfig<R>) {
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

export function defaultObject<T>(o: { default: T }): T;
export function defaultObject<T extends object>(o: T): T;
export function defaultObject(o: unknown): unknown {
  if (Object.prototype.hasOwnProperty.call(o, 'default')) {
    return (o as { default: unknown }).default;
  }
  return o || {};
}
