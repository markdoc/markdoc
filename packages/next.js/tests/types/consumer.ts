import withMarkdoc from '@markdoc/next.js';
import withMarkdocAlias from '@markdoc/next.js/index';
import loader from '@markdoc/next.js/loader';
import { defaultObject, getSchema } from '@markdoc/next.js/runtime';
import { comment, head, image, link, script } from '@markdoc/next.js/tags';
import type {
  MarkdocNextJsConfig,
  MarkdocNextJsOptions,
  MarkdocNextJsPageProps,
  MarkdocNextJsSchema,
} from '@markdoc/next.js';
import type { NextConfig } from 'next';
import Markdoc from '@markdoc/markdoc';
import * as React from 'react';

const options: MarkdocNextJsOptions = {
  extension: /\.(md|mdoc)$/,
  mode: 'static',
  dir: '/app',
  schemaPath: './markdoc',
  nextjsExports: ['metadata', 'revalidate'],
  options: { slots: true, allowComments: true, breaks: true },
};
const config: NextConfig = withMarkdoc(options)({
  pageExtensions: ['js', 'md'],
});
const defaults: NextConfig = withMarkdoc()();
const alias: typeof withMarkdoc = withMarkdocAlias;
const functionCondition: MarkdocNextJsOptions = {
  extension: { or: [/\.md$/, (file) => file.endsWith('.mdoc')] },
};

// @ts-expect-error Unsupported rendering modes must be rejected.
withMarkdoc({ mode: 'dynamic' });
// @ts-expect-error Next.js export names must be strings.
withMarkdoc({ nextjsExports: [true] });
// @ts-expect-error Parser flags must be boolean.
withMarkdoc({ options: { slots: 'yes' } });

const schema: MarkdocNextJsSchema<{ product: string }> = {
  render: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('aside', null, children),
  transform(node, config) {
    const source: string = config.source;
    const product: string = config.product;
    // @ts-expect-error The source passed to schemas is read-only.
    config.source = 'changed';
    return source + product + node.tag;
  },
};
const schemaConfig: MarkdocNextJsConfig = { source: '# Example' };
const props: MarkdocNextJsPageProps = {
  markdoc: {
    content: Markdoc.transform(Markdoc.parse('# Example')),
    frontmatter: { title: 'Example' },
    file: { path: '/example.md' },
  },
};

function Callout({ children }: { children?: React.ReactNode }) {
  return React.createElement('aside', null, children);
}
function Badge({ label }: { label: string }) {
  return React.createElement('span', null, label);
}
// Different components can require different props within the same schema.
const resolved = getSchema({
  tags: {
    callout: { render: Callout },
    badge: { render: Badge },
    comment: { transform: () => [] },
  },
  nodes: { paragraph: { render: Callout } },
});
Markdoc.renderers.react(props.markdoc!.content, React, {
  components: resolved.components,
});
const moduleDefault: { source: string } = defaultObject({
  default: { source: 'x' },
});
const moduleNamespace: { source: string } = defaultObject({ source: 'x' });
const result: Promise<void> = loader.call(
  {
    resourcePath: '/app/pages/example.md',
    getOptions: () => ({ dir: '/app', pagesDir: '/app/pages' }),
    getResolve: () => async (_context, request) => request,
    addContextDependency: (_directory) => {},
    async: () => (_error, _source) => {},
  },
  '# Example'
);

void [
  config,
  defaults,
  alias,
  functionCondition,
  schema,
  schemaConfig,
  props,
  moduleDefault,
  moduleNamespace,
  result,
  comment,
  head,
  image,
  link,
  script,
];
