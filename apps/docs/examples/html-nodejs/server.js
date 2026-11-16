const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const Markdoc = require('@markdoc/markdoc');
const callout = require('./schema/Callout.markdoc');
const heading = require('./schema/heading.markdoc');
const { createContentManifest } = require('./createContentManifest');

const PORT = 4242;
const CONTENT_DIR = path.join(__dirname, 'content');
const TEMPLATE = fs.readFileSync('./public/template.html', 'utf-8');


// The content manifest maps routes to Markdoc documents.
const contentManifest = createContentManifest(CONTENT_DIR);
// Loads the built JS
app.use(express.static('dist'));

app.get('*', (req, res) => {
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
