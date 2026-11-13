import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Markdoc from '@markdoc/markdoc';
import callout from './schema/Callout.markdoc.js';
import heading from './schema/heading.markdoc.js';
import { createContentManifest } from './createContentManifest.js';

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

  const document = contentManifest[req.query.path];

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

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
