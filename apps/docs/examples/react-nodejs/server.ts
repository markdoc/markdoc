import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Markdoc from '@markdoc/markdoc';
import callout from './schema/Callout.markdoc.ts';
import heading from './schema/heading.markdoc.ts';
import { createContentManifest } from './createContentManifest.ts';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 4242;
const CONTENT_DIR = join(__dirname, 'content');

// Serve static files from the Vite build directory
app.use(express.static(join(__dirname, 'static')));

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
