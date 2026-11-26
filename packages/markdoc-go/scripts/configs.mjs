// Builds a Markdoc config from fixture data, which configdata_test.go
// mirrors in Go. The data is a config as JS accepts it, plus:
//
// - partials map file names to Markdoc source.
// - {$hook: name} stands for code from hooks.mjs.
// - matches: {regex, flags} is a RegExp.
// - a node or tag with `extends: name` spreads that built-in schema.
import { makeHooks } from './hooks.mjs';

export function buildConfig(Markdoc, data) {
  if (!data) return undefined;
  const hooks = makeHooks(Markdoc);

  const value = (v) => {
    if (Array.isArray(v)) return v.map(value);
    if (v && typeof v === 'object') {
      if ('$hook' in v) {
        if (!(v.$hook in hooks)) throw new Error(`Unknown hook: ${v.$hook}`);
        return hooks[v.$hook];
      }
      if ('regex' in v) return new RegExp(v.regex, v.flags ?? '');
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, value(x)]),
      );
    }
    return v;
  };

  const schemas = (map, builtins) =>
    map &&
    Object.fromEntries(
      Object.entries(map).map(([name, schema]) => {
        if (schema === null) return [name, null];
        const { extends: base, ...rest } = value(schema);
        return [name, base ? { ...builtins[base], ...rest } : rest];
      }),
    );

  const config = { ...data };
  if (data.tags) config.tags = schemas(data.tags, Markdoc.tags);
  if (data.nodes) config.nodes = schemas(data.nodes, Markdoc.nodes);
  if (data.functions) config.functions = value(data.functions);
  if (data.partials)
    config.partials = Object.fromEntries(
      Object.entries(data.partials).map(([file, source]) => [
        file,
        Markdoc.parse(source, { file }),
      ]),
    );
  return config;
}
