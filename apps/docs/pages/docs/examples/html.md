---
title: Using Markdoc with HTML and Web Components
---

# {% $markdoc.frontmatter.title %}

Markdoc supports [rendering Markdoc syntax into HTML](/docs/render#html) with the HTML renderer.

To get started with the HTML renderer, check out [this example repo](https://github.com/markdoc/docs/tree/main/examples/html-nodejs) for how to use Markdoc with [`express`](https://expressjs.com/) and [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components). You can use the HTML renderer without Web Components to transform and render HTML, but we recommend using Web Components as a way to organize and encapsulate functionality for custom Markdoc components.

## Setup

This guide assumes that you have an `Express` app installed. If you're starting from scratch, follow [these instructions to install Express](https://expressjs.com/en/starter/installing.html) and create an app.

1. Set up a Markdoc schema.

   ```shell
   schema/
   ├── Callout.markdoc.js
   └── heading.markdoc.js
   ```

   ```js
   // [schema/Callout.markdoc.js](https://github.com/markdoc/docs/blob/main/examples/html-nodejs/schema/Callout.markdoc.js)

   module.exports = {
     render: 'markdoc-callout',
     children: ['paragraph'],
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
   // [schema/heading.markdoc.js](https://github.com/markdoc/docs/blob/main/examples/html-nodejs/schema/heading.markdoc.js)

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

2. Define a component for any custom tag. Since `heading` is a core Markdown [node](/docs/nodes), Markdoc already knows how to render it using the CommonMark spec. `Callout` needs a component since it's a custom tag. We used [`lit`](https://lit.dev/docs/) in our example to define a Web Component for the `markdoc-callout` element.

   ```js
   // [src/Callout.js](https://github.com/markdoc/docs/blob/main/examples/html-nodejs/src/Callout.js)

   import { html, css, LitElement } from 'lit';

   export class MarkdocCallout extends LitElement {
     static styles = css`
       .note {
         background-color: #8792a2;
       }
       .caution {
         background-color: #d97917;
       }
       .check {
         background-color: #000000;
       }
       .warning {
         background-color: #ed5f74;
       }
     `;

     static properties = {
       type: { type: String }
     };

     constructor() {
       super();
       this.type = 'note';
     }

     render() {
       return html`<p class="${this.type}"><slot></slot></p>`;
     }
   }
   ```

3. Parse your Markdoc documents on the server to create a map of your routes and Markdoc content. We call this a "content manifest" which is used during a request to return the right Markdoc content for the route.

   ```js
   // [...](https://github.com/markdoc/docs/blob/main/examples/html-nodejs/createContentManifest.js#L19-L20)
   const rawText = fs.readFileSync(file, 'utf-8');
   const ast = Markdoc.parse(rawText);
   ```

4. Call `Markdoc.transform` on the server with a config of your custom tags, nodes, and any variables you want your Markdoc content to access. Then, use the HTML Markdoc renderer (`Markdoc.renderers.html`) to render the transformed content into the HTML to display to your user.

   ```js
   // [server.js](https://github.com/markdoc/docs/blob/main/examples/html-nodejs/server.js#L47)

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
     const rendered = Markdoc.renderers.html(content) || '';
     const html = TEMPLATE.replace(/{{ CONTENT }}/, rendered);
     return res.send(html);
   });

   app.listen(4242, () => {
     console.log(`Example app listening on port ${4242}`);
   });
   ```

5. Make sure to include any bundled scripts (in this case `main.js`) with your custom components on the client. This example uses a simple HTML template to inject the Markdoc content, but you can use other templating engines (for example: Pug, Handlebars, and so on) to manage this content injection for you.

   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="utf-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <meta name="description" content="Web site created using Markdoc" />
       <title>Markdoc: Create HTML Example</title>
     </head>
     <body>
       {{ CONTENT }}
       <script src="./main.js"></script>
     </body>
   </html>
   ```

6. Start the demo app.
   ```shell
   npm run build
   ```
   and
   ```shell
   npm run start
   ```
