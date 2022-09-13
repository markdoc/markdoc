import { promises as fs } from 'fs';
import { resolve } from 'path';
import { diffJson, diffChars } from 'diff';
import yaml from 'yaml-js';

import markdoc from '../../index';
import React from './react-shim';

class Loader extends yaml.loader.Loader {
  construct_mapping(node) {
    return {
      ...super.construct_mapping(node),
      $$lines: {
        start: node.start_mark.line,
        end: node.end_mark.line,
      },
    };
  }
}

const tokenizer = new markdoc.Tokenizer({ allowIndentation: true, allowComments: true });

function parse(content: string, file?: string) {
  const tokens = tokenizer.tokenize(content);
  return markdoc.parse(tokens, file);
}

function stripLines(object) {
  const removeLines = (key, value) => (key === '$$lines' ? undefined : value);
  return JSON.parse(JSON.stringify(object, removeLines));
}

function render(code, config, dynamic) {
  const partials = {};
  for (const [file, content] of Object.entries(config.partials ?? {}))
    partials[file] = parse(content as string, file);

  const { react, reactStatic } = markdoc.renderers;
  const transformed = markdoc.transform(code, { ...config, partials });
  return dynamic ? react(transformed, React) : eval(reactStatic(transformed));
}

function checkMatch(diffs) {
  return diffs.find((diff) => diff.added || diff.removed);
}

function run(
  { code = null, renderer = 'react', config = {}, expected = undefined } = {},
  dynamic
) {
  if (renderer === 'html') {
    const transformed = markdoc.transform(code, config);
    const output = markdoc.renderers.html(transformed);
    const diff = diffChars((expected || '').trim(), (output || '').trim());
    return checkMatch(diff) ? diff : false;
  }

  const output = render(code, config, dynamic) || {};
  const diff = diffJson(expected || {}, output.children || []);
  return checkMatch(diff) ? diff : false;
}

function formatter(filename, { $$lines: lines, name, code }, diff) {
  const prettyDiff = diff
    .flatMap((part) => [
      part.added ? '\x1b[32m' : part.removed ? '\x1b[31m' : '\x1b[0m',
      part.added || part.removed ? part.value.replace(/ /g, '⎵') : part.value,
    ])
    .join('');

  return [
    `\x1b[31mFAILED:\x1b[0m ${filename}:${lines.start}`,
    name,
    code,
    prettyDiff,
  ].join('\n\n');
}

function formatValidation(filename, test, validation) {
  const { $$lines: lines, name, code } = test;

  let output = '';
  for (const {
    lines,
    error: { message },
  } of validation)
    output += `${lines ? lines[0] : '?'}:${message}\n`;

  return [
    `\x1b[31mINVALID:\x1b[0m ${filename}:${lines.start}`,
    name,
    code,
    output,
  ].join('\n\n');
}

(async () => {
  const [filename, line] = process.argv.slice(2).join('').split(':');
  const path = resolve(filename);
  const file = await fs.readFile(path);
  const tests = yaml.load(file, Loader);

  let exitCode = 0;
  for (const test of tests) {
    const code = parse(test.code || '');

    const { start, end } = test.$$lines;
    if (line && (Number(line) - 1 < start || Number(line) - 1 > end)) continue;

    const validation = markdoc.validate(code, test.config);

    let result;
    if (test.expectedError) {
      const output = validation.map((v) => v.error.message).join('\n');
      const diff = diffChars(
        (test.expectedError || '').trim(),
        (output || '').trim()
      );

      result = checkMatch(diff) ? diff : false;
    } else {
      if (validation.length && test.validation != false)
        console.log(formatValidation(path, test, validation));

      result = run({ ...stripLines(test), code }, true);
    }

    if (!result) continue;
    console.log(formatter(path, test, result));
    exitCode = 1;
  }
  process.exit(exitCode);
})();
