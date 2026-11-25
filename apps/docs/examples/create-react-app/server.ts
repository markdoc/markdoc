import express from 'express';
import path from 'node:path';
import Markdoc from '@markdoc/markdoc';
import callout from './schema/Callout.markdoc';
import heading from './schema/heading.markdoc';
import { createContentManifest } from './createContentManifest';

const app = express();

const PORT = 4242;
const CONTENT_DIR = path.join(__dirname, '../content');

// The content manifest maps routes to Markdoc documents.
const contentManifest = createContentManifest(CONTENT_DIR);

app.get('/markdoc-api', (req, res) => {
  // Here we can dynamically fetch variables, like user preferences or feature flags
  const variables = {
    flags: {
      show_secret_feature: false
    }
  };

  const route = typeof req.query.path === 'string' ? req.query.path : '';
  const document = contentManifest[route];

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

  return res.json(content);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
