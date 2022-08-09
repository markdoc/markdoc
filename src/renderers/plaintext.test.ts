import { diff } from 'jest-diff';

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

{% callout #id   .class   a="check" b={e: 5} c=8 d=[1, 2, 3] %}
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
Markdoc uses…
`;

const expected = `---
title: What is Markdoc?
---

# {% $markdoc.frontmatter.title %} {% #overview %}

Markdoc is a **Markdown**-based \`syntax\` and _toolchain_ for creating custom documentation sites. Stripe created Markdoc to power [http://stripe.com/docs](our public docs).

> Blockquote

---

![Alt](/image)

{% callout #id .class a="check" b={"e":5} c=8 d=[1,2,3] %}
Markdoc is open-source—check out it's [http://github.com/markdoc/markdoc](source) to see how it works.
{% /callout %}

\`\`\`js {% .class #id x="test" render=false %}
Code!
\`\`\`

## How is {% markdoc("test", 1) %} different? {% .classname %}

foo\\
baz

Soft
break
Markdoc uses…
`;

function check(source, expected, options = {}) {
  const a = expected;
  const b = render(Markdoc.parse(source), options);
  // console.log(a, b);
  const d = diff(a, b);
  if (d && d.includes('Compared values have no visual difference.')) return;
  throw d;
}

fdescribe('Plaintext renderer', function () {
  it('basics', function () {
    check(source, expected);
  });

  it('nested tags', () => {
    check(
      `
{% checkout %}
  {% if true %}
  Yes!
  {% /if %}
{% /checkout %}
    `,
      `
{% checkout %}
{% if true %}
Yes!
{% /if %}
{% /checkout %}
`
    );
  });

  it('nested tags — allowIndentation: true', () => {
    check(
      `
{% checkout %}
  {% if true %}
  Yes!
  {% /if %}
{% /checkout %}
    `,
      `
{% checkout %}
  {% if true %}
    Yes!
  {% /if %}
{% /checkout %}
`,
      { allowIndentation: true }
    );
  });

  it('tables', () => {
    check(
      `
| Syntax      | Description |
| ------ | ---- |
| Header      | Title  |
| Paragraph        | Text        |

{% table %}

- One
- Two


---
- Three
- Four

{% /table %}

{% table %}
---
- H1
- H2
{% /table %}
    `,
      `
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |

{% table %}
* One
* Two
---
* Three
* Four
{% /table %}

{% table %}
---
* H1
* H2
{% /table %}
`
    );
  });

  it('lists', () => {
    check(
      `
- [Install Markdoc](/docs/getting-started)
- [Try it out online](/sandbox)

1. One
2. Two
3. Three

- A
- B
  - B2
- C`,
      `
- [/docs/getting-started](Install Markdoc)
- [/sandbox](Try it out online)

1. One
2. Two
3. Three

- A
- B
  - B2
- C
`
    );
  });
  it('"loose" lists', () => {
    check(
      `
- One

  My first paragraph
  Test

  {% tag %} 
    Indented tag
  {% /tag %} 

  \`\`\`
  Code
  \`\`\`

- Two

  My second paragraph
  
  ---
  
  ## Indented header`,
      `
- One

  My first paragraph
  Test

  {% tag %}
  Indented tag
  {% /tag %}

  \`\`\`
  Code
  \`\`\`

- Two

  My second paragraph

  ---

  ## Indented header

`
    );
  });

  it('complicated nested lists', () => {
    const source = `
* Create your CNAME record

  1. Click **Add record**.
  1. Enter these values in the form that opens:

      {% table %}
      * Field
      * Value to enter
      * Description
      ---
      * Type
      * Select \`CNAME\` from the dropdown
      * What kind of DNS record this is.
      ---
      * Target
      * If your custom subdomain is checkout.powdur.me, enter \`checkout\`
      * For CNAME records, this field is the first part of your subdomain (the part leading up to the first period).
      ---
      * Value
      * {% code %}hosted-checkout.stripecdn.com{% /code %}
      * This is what the new subdomain record points to-in this case, Stripe Checkout.
      ---
      * TTL
      * \`5 min\`
      * An expiration of 5 minutes (300 seconds) is OK.
      ---
      * Proxy status
      * \`Off\`
      * Set the proxy status to \`off\` to avoid issues during setup.
      {% /table %}`;

    const expected = `
- Create your CNAME record

  1. Click **Add record**.
  2. Enter these values in the form that opens:

    {% table %}
    * Field
    * Value to enter
    * Description
    ---
    * Type
    * Select \`CNAME\` from the dropdown
    * What kind of DNS record this is.
    ---
    * Target
    * If your custom subdomain is checkout.powdur.me, enter \`checkout\`
    * For CNAME records, this field is the first part of your subdomain (the part leading up to the first period).
    ---
    * Value
    * {% code %}hosted-checkout.stripecdn.com{% /code %}
    * This is what the new subdomain record points to-in this case, Stripe Checkout.
    ---
    * TTL
    * \`5 min\`
    * An expiration of 5 minutes (300 seconds) is OK.
    ---
    * Proxy status
    * \`Off\`
    * Set the proxy status to \`off\` to avoid issues during setup.
    {% /table %}

`;

    check(source, expected);
  });
});
