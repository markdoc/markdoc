---
title: A powerful, flexible, Markdown-based authoring framework
description: From personal blogs to massive documentation sites, Markdoc is a content authoring system that grows with you.
---

{% section .hero %}

{% typewriter /%}

> From personal blogs to massive documentation sites, Markdoc is a content authoring system that grows with you.

[View docs](/docs/getting-started) {% .primary %}

{% /section %}

{% section .try .no-mobile %}

{% sandbox height="630px" options={"scrollbarStyle": null} /%}

{% /section %}

{% section .value-props %}

{% table %}

---

- {% ascii "key" /%}

  {% item %}

  ### Open source {% .jumbo %}

  Maintain full control over your code and content. Markdoc is open-source and fully extensible.
  {% /item %}

- {% ascii "pencil" /%}

  {% item %}

  ### Developer & writer friendly {% .jumbo %}

  Markdoc delivers a powerful, flexible, developer experience (DX) with an equally capable authoring experience (AX).

  {% /item %}

- {% ascii "card" /%}

  {% item %}

  ### Adopt anywhere {% .jumbo %}

  Use Markdoc to create interactive documentation experiences, static content sites, authoring tooling, and more.

  {% /item %}

{% /table %}

{% /section %}

{% section .get-started %}

{% sideBySide %}

{% item %}

## Get started quickly {% .jumbo %}

[Markdoc core](https://github.com/markdoc/markdoc) is a lightweight package containing everything you need to get started. If you want to get going even faster, check out our [Next.js plugin](https://github.com/markdoc/next.js) and deploy a Markdoc documentation site with zero boilerplate.

[Explore documentation](/docs/getting-started) {% .primary %}

[Live edit]() {% .primary %} {% .live-edit %}

{% /item %}

```shell
npm install @markdoc/markdoc
```

```js
import Markdoc from '@markdoc/markdoc';

const doc = `
# Hello world.
> My first Markdoc page
`;

const ast = Markdoc.parse(doc);

const content = Markdoc.transform(ast);

const html = Markdoc.renderers.html(content);
```

{% /sideBySide %}

{% /section %}

{% section .by-stripe %}

{% sideBySide %}

### Markdoc powers Stripe documentation {% .jumbo %}

Stripe created Markdoc to power its largest and [most detailed content site](https://stripe.com/docs). Since then, we have adopted it across the company, writing hundreds of thousands of lines of Markdoc to create thousands of pages of expressive, custom documentation.

{% /sideBySide %}

---

{% features %}

- **Familiar syntax**

  Markdoc is a syntactic extension of [Markdown](https://commonmark.org/), so you can keep using all the syntax and tooling you are used to.

  [Learn the syntax](/docs/syntax) {% .primary %}

- **Easily extensible**

  Markdoc lets you customize all aspects of the system, from [custom tags](/docs/tags) and [nodes](/docs/nodes) to entirely [new renderers](/docs/render).

  [Learn more](/docs/render) {% .primary %}

- **Built-in validation**

  You can add custom validation throughout your content system, ensuring nothing breaks and your content remains consistent.

  [Learn more](/docs/validation) {% .primary %}

{% /features %}

{% /section %}
