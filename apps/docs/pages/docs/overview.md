---
title: What is Markdoc?
description:
---

# {% $markdoc.frontmatter.title %}

Markdoc is a Markdown-based document format and a framework for content publishing. It was designed internally at Stripe to meet the needs of our user-facing [product documentation](https://docs.stripe.com). Markdoc extends Markdown with a [custom syntax](/docs/syntax) for tags and annotations, providing a way to tailor content to individual users and introduce interactive elements.

{% youtube
  src="https://www.youtube-nocookie.com/embed/MAWK_VmjU1Y?controls=0"
  title="Introducing Markdoc"
  width="50%" /%}

## How Markdoc works

By design, Markdoc is not a full-blown templating language and does not allow mixing arbitrary code and content. It is, however, a fully declarative format that is machine-readable from top to bottom: it parses to a data structure that can be traversed to support powerful static analysis, validation, and programmatic content transformation.

The Markdoc [renderer](/docs/render) interprets custom [tag](/docs/tags) and [node](/docs/nodes) definitions, transforming the document data structure into a tree of renderable nodes, which is finally converted into the desired output format. The Markdoc framework currently includes three renderers: an HTML string renderer, a static React renderer that transpiles a document to JavaScript code, and a dynamic React renderer that converts renderable tree nodes directly into a React elements.

Markdoc's React renderer makes it possible to use React components within Markdown content, supporting interactive features like tab switchers and collapsible sections. It is possible to implement custom renderers that introduce support for additional output formats and client frameworks.
## Why add markup to Markdown?

We chose Markdown as a starting point because it is easy to read and reason about, already familiar to many engineers and technical writers, and widely supported by a large ecosystem of existing tools. Markdown by itself, however, isn't ideally suited for writing complex, highly-structured content like documentation.

Markdoc provides an extensible system for defining custom tags that can be used seamlessly in Markdown content. Using the custom tag syntax, we're able to express more elaborate document hierarchy, insert interactive components, and support features like conditional content, content inclusion, and variable interpolation. Markdoc's extensions to the Markdown syntax are designed to be composable and minimally intrusive, providing crucial functionality without compromising the readability of prose. 
## Under the hood

Markdoc's parser is built on top of a popular open-source Markdown library called [`markdown-it`](https://github.com/markdown-it/markdown-it). Markdoc uses `markdown-it` as a tokenizer, building an Abstract Syntax Tree (AST) from the array of tokens emitted by `markdown-it`. Markdoc's custom tag syntax is implemented inside of a `markdown-it` plugin. The logic that parses the tag syntax is generated from a [peg.js](https://pegjs.org/) grammar.

Markdoc has its own dedicated rendering architecture rather than relying on markdown-it to generate its output. Developing an independent rendering system was necessary in order to handle Markdoc's custom tags and support multiple output formats.

## Next steps

- [Install Markdoc](/docs/getting-started)
- [Try it out online](/sandbox)
