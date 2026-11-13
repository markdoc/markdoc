---
title: Common examples
description:
---

# {% $markdoc.frontmatter.title %}

With Markdoc, it's easy to add functionality you'd commonly associate with documentation sites. The examples below cover loops, syntax highlighting, tabs, and more.

If you're looking for other sample code, check out our collection of [example repos](https://github.com/markdoc/docs/tree/main/examples), or view the [source code for this site](https://github.com/markdoc/docs).

## Loops

Markdoc does not support writing loops directly in documents. If you need to loop through content, do so in a custom [Node](/docs/nodes) or [Tag](/docs/tags) `transform` function or in a custom [React component](/docs/render#react).

```js
import { Tag } from '@markdoc/markdoc';

export const group = {
  render: 'Group',
  attributes: {
    items: { type: Array }
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.transformChildren(config);

    for (const item of attributes.items) {
      /* Do something with each item */
    }

    return new Tag('Group', attributes, children);
  }
};
```

{% example %}

```md
{% group items=[1, 2, 3] /%}
```

{% /example %}

## Syntax highlighting

You can hook up syntax highlighting for code blocks by creating a custom `fence` [node](/docs/nodes). This example shows how to do so with [Prism](https://prismjs.com/).

```js
// [Source example](https://github.com/markdoc/docs/blob/main/components/Code.js)

import 'prismjs';
import 'prismjs/themes/prism.css';

import Prism from 'react-prism';

export function Fence({ children, language }) {
  return (
    <Prism key={language} component="pre" className={`language-${language}`}>
      {children}
    </Prism>
  );
}

const fence = {
  render: 'Fence',
  attributes: {
    language: {
      type: String
    }
  }
};

const content = Markdoc.transform(ast, {
  nodes: {
    fence
  }
});

Markdoc.renderers.react(content, React, {
  components: {
    Fence
  }
});
```

## Switch statements

You can create your own `switch`/`case` semantics with custom Markdoc tags.

```js
import { transformer } from '@markdoc/markdoc';

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  tags: {
    switch: {
      attributes: { primary: { render: false } },
      transform(node, config) {
        const attributes = node.transformAttributes(config);

        const child = node.children.find(
          (child) => child.attributes.primary === attributes.primary
        );

        return child ? transformer.node(child, config) : [];
      }
    },
    case: {
      attributes: { primary: { render: false } }
    }
  }
};
```

which can then be used in your document:

{% example %}

```md
{% switch $item %}

{% case 1 %}
Case 1
{% /case %}

{% case 2 %}
Case 2
{% /case %}

{% /switch %}
```

{% /example %}

## Table of contents

To create a table of contents, first collect all headings from the page content:

```js
// [Source example](https://github.com/markdoc/docs/blob/bae62d06109e3e699778fe901c8015d41b1c7c9f/pages/_app.js#L58-L79)

function collectHeadings(node, sections = []) {
  if (node) {
    // Match all h1, h2, h3… tags
    if (node.name.match(/h\d/)) {
      const title = node.children[0];

      if (typeof title === 'string') {
        sections.push({
          ...node.attributes,
          title
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        collectHeadings(child, sections);
      }
    }
  }

  return sections;
}

const content = Markdoc.transform(ast);
const headings = collectHeadings(content);
```

Then, render the headings in a list:

```js
// [Source example](https://github.com/markdoc/docs/blob/main/components/Shell/TableOfContents.js)

function TableOfContents({ headings }) {
  const items = headings.filter((item) => [2, 3].includes(item.level));

  return (
    <nav>
      <ul>
        {items.map((item) => (
          <li key={item.title}>
            <a href={`#${item.id}`}>{item.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

Finally, add IDs to the headings using ID [annotations](/docs/syntax#annotations)

{% example %}

```md
# My header {% #my-id %}
```

{% /example %}

## Tabs

First, create the Markdoc tags

```js
import { Tag } from '@markdoc/markdoc';

const tabs = {
  render: 'Tabs',
  attributes: {},
  transform(node, config) {
    const labels = node
      .transformChildren(config)
      .filter((child) => child && child.name === 'Tab')
      .map((tab) => (typeof tab === 'object' ? tab.attributes.label : null));

    return new Tag(this.render, { labels }, node.transformChildren(config));
  }
};

const tab = {
  render: 'Tab',
  attributes: {
    label: {
      type: String
    }
  }
};

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  tags: {
    tabs,
    tab
  }
};
```

Then, create a `Tab` and `Tabs` React component which map to the `tab` and `tabs` tag:

{% sideBySide %}

```js
// components/Tabs.js

import React from 'react';

export const TabContext = React.createContext();

export function Tabs({ labels, children }) {
  const [
    currentTab,
    setCurrentTab
  ] = React.useState(labels[0]);

  {% comment %}
  prettier-ignore-start
  {% /comment %}
  return (
    <TabContext.Provider value={currentTab}>
      <ul role="tablist">
        {labels.map((label) => (
          <li key={label}>
            <button
              role="tab"
              aria-selected={label === currentTab}
              onClick={() => setCurrentTab(label)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      {children}
    </TabContext.Provider>
  );
  {% comment %}
  prettier-ignore-end
  {% /comment %}
};
```

```js
// components/Tab.js

import React from 'react';
import { TabContext } from './Tabs';

export function Tab({ label, children }) {
  const currentTab = React.useContext(TabContext);

  if (label !== currentTab) {
    return null;
  }

  return children;
}
```

{% /sideBySide %}

and use the tags in your document.

{% example %}

```md
{% tabs %}

{% tab label="React" %}
React content goes here
{% /tab %}

{% tab label="HTML" %}
HTML content goes here
{% /tab %}

{% /tabs %}
```

{% /example %}
