---
title: Using Markdoc with React
---

# {% $markdoc.frontmatter.title %}

Markdoc supports [rendering Markdoc syntax with React](/docs/render#react) out-of-the-box.

To get started with React, check out [this example repo](https://github.com/markdoc/docs/tree/main/examples/react-nodejs) for how to use Markdoc with [`create-react-app`](https://create-react-app.dev/) and [`express`](https://expressjs.com/).

## Setup

Follow these steps to build a Markdoc app with [`create-react-app`](https://create-react-app.dev/) and [`express`](https://expressjs.com/).

1. Follow the [`create-react-app` getting started steps](https://create-react-app.dev/docs/getting-started) to create your initial app
2. Set up a Markdoc schema

   ```shell
   schema/
   ├── Callout.markdoc.js
   └── heading.markdoc.js
   ```

   ```js
   // [schema/Callout.markdoc.js](https://github.com/markdoc/docs/blob/dcba1a62be92097e3fd50c21e05fd6d2ea709312/examples/react-nodejs/schema/Callout.markdoc.js#L1-L18)

   module.exports = {
     render: 'Callout',
     children: ['paragraph', 'tag', 'list'],
     attributes: {
       type: {
         type: String,
         default: 'note',
         matches: ['check', 'error', 'note', 'warning']
       }
     }
   };
   ```

   ```js
   // [schema/heading.markdoc.js](https://github.com/markdoc/docs/blob/dcba1a62be92097e3fd50c21e05fd6d2ea709312/examples/react-nodejs/schema/heading.markdoc.js#L1-L22)

   const { nodes } = require('@markdoc/markdoc');

   function generateID(children, attributes) {
     if (attributes.id && typeof attributes.id === 'string') {
       return attributes.id;
     }
     return children
       .filter((child) => typeof child === 'string')
       .join(' ')
       .replace(/[?]/g, '')
       .replace(/\s+/g, '-')
       .toLowerCase();
   }

   module.exports = {
     ...nodes.heading,
     transform(node, config) {
       const base = nodes.heading.transform(node, config);
       base.attributes.id = generateID(base.children, base.attributes);
       return base;
     }
   };
   ```

3. Parse your Markdoc documents on the server

   ```js
   // [...](https://github.com/markdoc/docs/blob/main/examples/react-nodejs/createContentManifest.js#L13)
   const rawText = fs.readFileSync(file, 'utf-8');
   const ast = Markdoc.parse(rawText);
   ```

4. Call `Markdoc.transform` on the server

   ```js
   // [server.js](https://github.com/markdoc/docs/blob/main/examples/react-nodejs/server.js)

   const express = require('express');

   const app = express();

   const callout = require('./schema/callout.markdoc');
   const heading = require('./schema/heading.markdoc');

   // [...](https://github.com/markdoc/docs/blob/dcba1a62be92097e3fd50c21e05fd6d2ea709312/examples/react-nodejs/server.js#L8-L14)

   app.get('/markdoc', (req, res) => {
     const ast = contentManifest[req.query.path];

     const config = {
       tags: {
         callout
       },
       nodes: {
         heading
       },
       variables: {}
     };

     const content = Markdoc.transform(ast, config);

     return res.json(content);
   });

   app.listen(4242, () => {
     console.log(`Example app listening on port ${4242}`);
   });
   ```

5. Call `Markdoc.renderers.react` on the client

   ```js
   // src/App.js

   import React from 'react';
   import Markdoc from '@markdoc/markdoc';

   import { Callout } from './Callout';

   export default function App() {
     const [content, setContent] = React.useState(null);

     React.useEffect(() => {
       (async () => {
         const response = await fetch(
           `/markdoc?` +
             new URLSearchParams({ path: window.location.pathname }),
           { headers: { Accept: 'application/json' } }
         );

         if (response.status === 404) {
           setContent('404');
           return;
         }

         const content = await response.json();
         setContent(content);
       })();
     }, []);

     if (content === '404') {
       return <p>Page not found.</p>;
     }

     if (!content) {
       return <p>Loading...</p>;
     }

     const components = {
       Callout
     };

     return Markdoc.renderers.react(content, React, { components });
   }
   ```

6. Start up the client and server
   ```shell
   npm run start:client
   ```
   and
   ```shell
   npm run start:server
   ```

\
Or, clone [this starter repo](https://github.com/markdoc/docs/tree/main/examples/react-nodejs) and follow the directions in the [README](https://github.com/markdoc/docs/tree/main/examples/react-nodejs/README.md).
