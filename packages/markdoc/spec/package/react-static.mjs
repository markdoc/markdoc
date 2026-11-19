import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';

const entry = new URL(`../../dist/${process.argv[2]}`, import.meta.url);
const Markdoc = entry.pathname.endsWith('.mjs')
  ? await import(entry.href)
  : createRequire(import.meta.url)(fileURLToPath(entry));

const React = {
  Fragment: 'fragment',
  createElement(name, attributes, ...children) {
    return { name, attributes, children };
  },
};

function render(node, options, components) {
  const source = Markdoc.renderers.reactStatic(node, options);
  const component = runInThisContext(`(React) => ${source}`)(React);
  return component({ components });
}

const tree = Markdoc.transform(Markdoc.parse('# Hello\n\nRead **this**.'));
assert.deepEqual(render(tree), Markdoc.renderers.react(tree, React));

const components = { Notice: 'aside' };
const tag = new Markdoc.Tag('Notice', { class: 'notice' }, ['Hello']);
const expected = {
  name: 'aside',
  attributes: { className: 'notice' },
  children: ['Hello'],
};
assert.deepEqual(render(tag, undefined, components), expected);
assert.deepEqual(render([tag], undefined, components), {
  name: 'fragment',
  attributes: null,
  children: [expected],
});

for (const resolveTagName of [
  function tagName(_name, components) {
    return components.Notice;
  },
  function renamedResolver(_name, components) {
    return components.Notice;
  },
  (_name, components) => components.Notice,
]) {
  const customTag = new Markdoc.Tag('Custom', { class: 'notice' }, ['Hello']);
  assert.deepEqual(render(customTag, { resolveTagName }, components), expected);
}
