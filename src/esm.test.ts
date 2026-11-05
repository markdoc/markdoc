import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const dist = path.resolve(__dirname, '../dist/index.js');

describe('CommonJS build', function () {
  it('exposes named exports to native ESM imports', function () {
    if (!fs.existsSync(dist)) pending('run `npm run build` first');

    const script = `
      import Markdoc, { Node, Tag, parse, transform } from ${JSON.stringify(
        pathToFileURL(dist).href
      )};
      console.log([typeof Markdoc.parse, typeof Node, typeof Tag, typeof parse, typeof transform].join(','));
    `;
    const output = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script],
      { encoding: 'utf8' }
    );

    expect(output.trim()).toEqual(
      'function,function,function,function,function'
    );
  });
});
