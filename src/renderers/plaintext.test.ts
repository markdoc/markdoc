import Markdoc from '../../index';
import render from './plaintext';

const source = `---
title: What is Markdoc?
---

# {% $markdoc.frontmatter.title %} {% #overview %}

Markdoc is a **Markdown**-based \`syntax\` and _toolchain_ for creating custom documentation sites. Stripe created Markdoc to power [our public docs](http://stripe.com/docs).

> Blockquote

---

![Alt](/image)

{% callout a="check" b={e: 5} c=8 d=[1, 2, 3] %}
Markdoc is open-source—check out it's [source](http://github.com/markdoc/markdoc) to see how it works.
{% /callout %}

\`\`\`js
Code!
\`\`\`

## How is {% markdoc("test", 1) %} different? {% .classname %}

foo\\
baz

Soft 
 break
Markdoc uses a fully declarative approach to composition and flow control, where other solutions…[read more](/docs/overview)

## Next steps
- [Install Markdoc](/docs/getting-started)
- [Try it out online](/sandbox)

| Syntax      | Description |
| ------ | ---- |
| Header      | Title  |
| Paragraph        | Text        |
`;

const ast = Markdoc.parse(source);

fdescribe('Plaintext renderer', function () {
  it('rendering a tag', function () {
    console.log(render(ast));
  });
});
