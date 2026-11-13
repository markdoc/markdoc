const express = require('express');
const app = express();
const path = require('path');

const Markdoc = require('@markdoc/markdoc');
const callout = require('./schema/callout.markdoc');
const heading = require('./schema/heading.markdoc');
const { createContentManifest } = require('./createContentManifest');

const PORT = 4242;
const CONTENT_DIR = path.join(__dirname, 'content');

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

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
