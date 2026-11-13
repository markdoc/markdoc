import assert from 'node:assert/strict';
import withMarkdoc from '@markdoc/next.js';
import loader from '@markdoc/next.js/loader';
import { getSchema, defaultObject } from '@markdoc/next.js/runtime';
import { link } from '@markdoc/next.js/tags';

assert.equal(typeof withMarkdoc, 'function');
assert.equal(typeof withMarkdoc()().webpack, 'function');
assert.equal(typeof loader, 'function');
assert.equal(typeof getSchema, 'function');
assert.equal(typeof defaultObject, 'function');
assert.equal(link.attributes.href.required, true);
