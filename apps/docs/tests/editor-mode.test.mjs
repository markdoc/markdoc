import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
// CodeMirror's Node runner loads modes without a browser or DOM.
const CodeMirror = require('codemirror/addon/runmode/runmode.node');
require('codemirror/mode/markdown/markdown');
await import('../components/codemirror/markdoc.ts');

function tokenize(source) {
  const tokens = [];
  CodeMirror.runMode(source, 'markdoc', (text, style) => {
    tokens.push({ text, style });
  });
  assert.equal(tokens.map(({ text }) => text).join(''), source);
  return tokens;
}

test('the editor mode highlights Markdown, tags, and quoted attributes', () => {
  const tokens = tokenize(
    '# Heading\n{% callout type="note" %}\nHello\n{% /callout %}'
  );
  assert.ok(tokens.some(
    ({ text, style }) => text === 'Heading' && style.includes('header')
  ));
  assert.ok(tokens.some(
    ({ text, style }) => text === '{% callout' && style === 'keyword'
  ));
  assert.ok(tokens.some(
    ({ text, style }) => text.includes('note') && style === 'string'
  ));
  assert.ok(tokens.some(
    ({ text, style }) => text === 'Hello' && style === null
  ));
});

test('the editor mode resumes Markdown after a multiline comment', () => {
  const tokens = tokenize('{% comment %}\nHidden text\n{% /comment %}\n# Visible');
  assert.ok(tokens.some(
    ({ text, style }) => text === 'Hidden text' && style === 'comment'
  ));
  assert.ok(tokens.some(
    ({ text, style }) => text === 'Visible' && style.includes('header')
  ));
});

test('copied editor state does not share its tag stack', () => {
  const mode = CodeMirror.getMode(CodeMirror.defaults, 'markdoc');
  const state = CodeMirror.startState(mode);
  mode.token(new CodeMirror.StringStream('{% callout'), state);
  const copy = CodeMirror.copyState(mode, state);
  copy.states.pop();
  assert.deepEqual(state.states, ['tag']);
  assert.deepEqual(copy.states, []);
});
