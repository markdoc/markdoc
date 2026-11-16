---
title: Frequently asked questions
---

# {% $markdoc.frontmatter.title %}

## Is Markdoc compliant with the CommonMark specification?

Markdoc's syntax is largely a superset of the [CommonMark specification](https://commonmark.org/). Markdoc introduces its own [syntactic extensions](/docs/syntax), which include [tags](/docs/tags), [annotations](/docs/syntax#annotations), and [variable interpolation](/docs/variables). Markdoc also supports [GitHub-flavored tables](https://github.github.com/gfm/#tables-extension-), though we encourage you to use Markdoc's own [list-style tables](/docs/tags#table) instead.

### Setext headings

The only CommonMark-specified feature that Markdoc doesn't support is the [setext heading](https://spec.commonmark.org/0.30/#setext-headings). This design decision is largely an internal preference of the Markdoc core team: in our view, the setext heading is redundant with the more commonly-used [ATX heading](https://spec.commonmark.org/0.30/#atx-heading), and introduces more ambiguity. If you want to use setext headings in Markdoc or you need to support the feature in order to ensure compatibility with existing content, you can still reconfigure Markdoc's tokenizer to re-enable the [markdown-it](https://github.com/markdown-it/markdown-it) `lheading` rule.

### Indentation

In CommonMark-compliant Markdown, any content that is indented by four spaces is treated as a [code block](https://spec.commonmark.org/0.30/#indented-code-blocks). Unfortunately, this behavior makes it difficult to use arbitrary levels of indentation to improve the readability of documents with complex structure.

When using nested tags in Markdoc, it can be helpful to indent the content inside of tags so that the level of depth is clear. To support arbitrary indentation, we have to disable the indent-based code blocks and modify several other markdown-it parsing rules that account for indent-based code blocks. Markdoc's tokenizer accepts an `allowIndentation` option that applies these changes:

{% example %}
```js
const example = `
{% foo %}
  {% bar %}
    This is content inside of nested tags
  {% /bar %}
{% /foo %}
`;

const tokenizer = new markdoc.Tokenizer({allowIndentation: true}));
const tokens = tokenizer.tokenize(example);
const ast = markdoc.parse(tokens);
```
{% /example %}

The `allowIndentation` option is experimental and is not enabled by default. When the option is enabled, it is not possible to use indent-based code blocks. We strongly recommend using [fenced code blocks](https://spec.commonmark.org/0.30/#fenced-code-blocks) instead of indent-based code blocks regardless of whether you intend to take advantage of the `allowIndentation` option.

{% callout type="warning" %}
Markdoc content that incorporates arbitrary levels of indentation via the `allowIndentation` option may not be compatible with other CommonMark-compliant Markdown processing tools.
{% /callout %}

### Markdoc standardization

We have drafted a specification that describes Markdoc's tag syntax. We welcome third-party implementors to adopt and contribute to the Markdoc tag specification. The tag syntax is the only part of Markdoc that we are formally specifying at this time, but we are seriously considering the possibility of drafting a specification for the JSON representation of Markdoc's Abstract Syntax Tree (AST) in order to facilitate interoperability between Markdoc tools.

In the future, we may create a distinct dialect of Markdown that deviates further from the CommonMark specification, removing additional features like the angle-bracket [block quote](https://spec.commonmark.org/0.30/#block-quotes) syntax that can be replaced by Markdoc tags. We think there's an opportunity to create a Markdown variant specifically for Markdoc that is less ambiguous, more prescriptive, and more conducive to rigorous specification. This would be available alongside the CommonMark-aligned syntax that we support today, giving users the option to choose whether they want a cleaner syntax or compatibility with existing Markdown tools and content.

## Why create Markdoc instead of using an alternative?

### Why not MDX?

[MDX](https://mdxjs.com/) is a Markdown variant that allows users to embed content written in JavaScript and React's JSX templating syntax. Like Markdoc, MDX makes it possible to incorporate React components into a piece of documentation.  The key difference is that MDX supports arbitrarily-complex JavaScript logic (think: docs as code) while Markdoc enforces a strict separation between code and content (think: docs as data).

Markdoc uses a fully declarative approach to composition and flow control, where MDX relies on JavaScript and React. This means MDX affords users more power and flexibility, but at the cost of complexity–content can quickly become as complex as regular code, which can lead to maintainability complications or a more difficult authoring environment.

One of the key motivations for creating Markdoc at Stripe was to create a format that is optimized for writing rather than programming so that we could overcome the challenges that resulted from mixing code and content in our legacy documentation platform. With Markdoc, contributors can iterate quickly without having to subject their edits to a code review and the standard of technical scrutiny that we would have to apply to a format that supports embedded JavaScript. Markdoc also helps us enforce stronger controls around presentation and page logic, avoiding situations in which one-off hacks and procedural content generation introduce bugs and unpredictable behavior. 

Markdoc's first-class, declarative tag syntax integrates seamlessly with Markdown content and can make it simpler to handle content transforms, static analysis, and validation in a unified, lightweight manner. In MDX, some of these tasks require operating on a more complicated JavaScript AST and accounting for the full spectrum of JavaScript language features. MDX also has a significantly larger runtime dependency footprint and relies on a JavaScript parser to handle the embedded logic.

### Why not AsciiDoc?

[AsciiDoc](https://asciidoc.org/) is a plain-text markup format that is designed specifically for technical writing, incorporating ideas from DocBook and other publishing technologies. AsciiDoc gets a lot of things right–extensibility, support for highly-structured content, parsing to an AST, and open governance.

We are big fans of AsciiDoc–it was a major source of inspiration when we began designing Markdoc. In fact, our earliest efforts to modernize our content format at Stripe back in 2017 involved a proof-of-concept built on the Ruby-based [AsciiDoctor](https://asciidoctor.org/) library. There are several reasons why we ultimately moved to Markdown instead of proceeding with AsciiDoc as our efforts progressed.

AsciiDoc is less ubiquitous than Markdown, which means it is less familiar to engineers and technical writers. AsciiDoc has a number of syntactic idiosyncrasies that create friction for adopters, making it a tough sell to users who already know and want Markdown. For example, AsciiDoc requires the use of [multiple leading asterisks](https://docs.asciidoctor.org/asciidoc/latest/lists/unordered/#nested-unordered-list) in order to express nested bulleted lists because the format is designed to not treat whitespace as significant. And in order to nest delimited content blocks, it relies on [varying the length](https://docs.asciidoctor.org/asciidoc/latest/blocks/delimited/#nesting) of the delimiter line–unintutive and error-prone syntax.

AsciiDoc's extensibility model would have allowed us to repurpose some of the format's built-in patterns to do many of the same things we do in Markdoc, but at the cost of usability, because AsciiDoc ultimately wasn't designed with our requirements and use case in mind. Markdown paired with Markdoc's syntactic extensions result in an overall smaller surface area than AsciiDoc's feature set, which means less complexity and easier adoption.
