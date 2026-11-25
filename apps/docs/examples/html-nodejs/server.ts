import express from 'express';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import callout from './schema/Callout.markdoc.js';
import heading from './schema/heading.markdoc.js';
import { createContentManifest } from './createContentManifest.js';

const app = express();
// This module runs from .build/ after TypeScript compilation.
const root = fileURLToPath(new URL('..', import.meta.url));

const PORT = 4242;
const CONTENT_DIR = path.join(root, 'content');
const TEMPLATE = readFileSync(path.join(root, 'public/template.html'), 'utf-8');

// The content manifest maps routes to Markdoc documents.
const contentManifest = createContentManifest(CONTENT_DIR);
// Loads the built JS
app.use(express.static(path.join(root, 'dist')));

app.get<{ 0: string }>('*', (req, res) => {
  // Here we can dynamically fetch variables, like user preferences or feature flags
  const variables = {
    flags: {
      show_secret_feature: false
    }
  };

  const path = req.params[0];
  const document = contentManifest[path];

  if (!document) {
    return res.sendStatus(404);
  }

  const { ast } = document;
  const config = {
    tags: {
      callout
    },
    nodes: {
      heading
    },
    variables: variables
  };

  const content = Markdoc.transform(ast, config);
  const rendered = Markdoc.renderers.html(content) || '';
  const html = TEMPLATE.replace(/{{ CONTENT }}/, rendered);
  return res.send(html);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
