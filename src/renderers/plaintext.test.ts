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

\`\`\`js {% .class #id x="test"   render=false %}
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

1. One
2. Two
3. Three

| Syntax      | Description |
| ------ | ---- |
| Header      | Title  |
| Paragraph        | Text        |
`;

const expected = `---
title: What is Markdoc?
---

# {% $markdoc.frontmatter.title %} 

Markdoc is a **Markdown**-based \`syntax\` and _toolchain_ for creating custom documentation sites. Stripe created Markdoc to power [http://stripe.com/docs](our public docs).

> Blockquote

---

![Alt](/image)

{% callout a="check" b={"e":5} c=8 d=[1,2,3] %}

Markdoc is open-source—check out it's [http://github.com/markdoc/markdoc](source) to see how it works.

{% /callout %}

\`\`\`js {% .class #id x="test" render=false %}
Code!
\`\`\`

## How is {% markdoc("test", 1) %} different? 

foo\\
baz

Soft
break
Markdoc uses a fully declarative approach to composition and flow control, where other solutions…[/docs/overview](read more)

## Next steps

- [/docs/getting-started](Install Markdoc)
- [/sandbox](Try it out online)

1. One
2. Two
3. Three

| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
`;

const ast = Markdoc.parse(source);

fdescribe('Plaintext renderer', function () {
  it('rendering a tag', function () {
    const doc = render(ast);
    console.log(doc);
    expect(doc).toEqual(expected);
  });
});
