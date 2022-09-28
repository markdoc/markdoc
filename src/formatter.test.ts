import { diff } from 'jest-diff';

import Markdoc from '../index';
import format from './formatter';

const source = `---


title: What is Markdoc?

---

# {% $markdoc.frontmatter.title %} {% #overview %}

Markdoc is a **Markdown**-based \`syntax\` and _toolchain_ for creating ~~custom~~ documentation sites. Stripe created Markdoc to power [our public docs](http://stripe.com/docs).

> Blockquote {% .special %}

---

![Link](/href   "title")
    ![Alt](/image   "title")

{% callout #id   .class  .class2   a="check" b={"e":{"with space": 5}} c=8 d=[1,    "2",true] %}
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

Markdoc is a **Markdown**-based \`syntax\` and _toolchain_ for creating ~~custom~~ documentation sites. Stripe created Markdoc to power [our public docs](http://stripe.com/docs).

> Blockquote {% .special %}

---

![Link](/href "title")
![Alt](/image "title")

{% callout
   #id
   .class
   .class2
   a="check"
   b={e: {"with space": 5}}
   c=8
   d=[1, "2", true] %}
Markdoc is open-source—check out it's [source](http://github.com/markdoc/markdoc) to see how it works.
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

const tokenizer = new Markdoc.Tokenizer({ allowComments: true });

function check(source, expected, options = {}) {
  const a = expected?.trimStart();
  const b = format(Markdoc.parse(tokenizer.tokenize(source)), options);
  // console.log(a, b);
  const d = diff(a, b);
  if (d && d.includes('Compared values have no visual difference.')) return;
  throw d;
}

function stable(source, options?) {
  return check(source, source, options);
}

describe('Formatter', () => {
  it('empty', () => {
    expect(format(null)).toBe('');
    check('', '');
    check('\n\n\t\n   \n  \n\n', '');
    stable('\n\n\t\n   \n  \n\n');
  });

  it('basics', () => {
    check(source, expected);
    stable(expected);
  });

  it('comments', () => {
    const source = `<!--
    comment -->

<!-- comment
   with more
  than one
line  -->
`;
    const expected = `<!-- comment -->
<!-- comment
   with more
  than one
line -->
`;

    check(source, expected);
  });

  it('frontmatter', () => {
    const source = `---
title: Title
subtitle: Subtitle
---

`;
    check(source, source);
    stable(source);
  });

  it('complex attributes', () => {
    const source = `{% if $gates["<string_key>"].test["@var"] id="id with space" class="class with space" /%}`;
    const expected = `{% if
   $gates["<string_key>"].test["@var"]
   id="id with space"
   class="class with space" /%}
`;
    check(source, expected);
  });

  it('attribute edge cases', () => {
    const source = `{% key id=$user.name class=default($y, "test") %}Child{% /key %}`;
    const expected = `
{% key id=$user.name class=default($y, "test") %}Child{% /key %}
`;

    check(source, expected);
    stable(expected);
  });

  it('variables', () => {
    const source = `
{% tag "complex primary" /%}
{% if $primary %}
X
{% /if %}
{% $user.name %}
{% key x=$user.name new=$flag /%}
`;
    const expected = `
{% tag "complex primary" /%}

{% if $primary %}
X
{% /if %}

{% $user.name %}

{% key x=$user.name new=$flag /%}
`;

    check(source, expected);
    stable(expected);
  });

  it('functions', () => {
    const source = `
{% markdoc("test", 1) %}
{% key x=default($x, 1) /%}
`;
    const expected = `{% markdoc("test", 1) %}
{% key x=default($x, 1) /%}
`;

    check(source, expected);
    stable(expected, expected);
  });

  it('tags', () => {
    const source = `
{% key /%}

{% a %}{% /a %}

{% a %}
{% /a %}

{% a %}

{% /a %}
  
{% checkout %}
  {% if true %}
  Yes!
  {% /if %}
{% /checkout %}
    `;
    const expected = `
{% key /%}

{% a /%}

{% a /%}

{% a /%}

{% checkout %}
{% if true %}
Yes!
{% /if %}
{% /checkout %}
`;
    check(source, expected);
    stable(expected);
  });

  it('long tags', () => {
    const source = `
{% tag a=true b="My very long text well over 80 characters in total" c=123456789 d=false /%}
    `;
    const expected = `
{% tag
   a=true
   b="My very long text well over 80 characters in total"
   c=123456789
   d=false /%}
`;
    check(source, expected);
    stable(expected);
  });

  it('long tags with maxTagOpeningWidth=Infinity', () => {
    const source = `
{% tag a=true b="My very long text well over 80 characters in total" c=123456789 d=false /%}
`;
    check(source, source, { maxTagOpeningWidth: Infinity });
  });

  it('nested tags — allowIndentation: true', () => {
    const source = `
{% checkout %}
  {% if true %}
  Yes!
  {% /if %}
{% /checkout %}
    `;

    const expected = `
{% checkout %}
  {% if true %}
    Yes!
  {% /if %}
{% /checkout %}
`;

    check(source, expected, { allowIndentation: true });
    stable(expected, { allowIndentation: true });
  });

  it('tables', () => {
    const source = `
| Syntax      | Description |
| ------ | ---- |
| Header      | Title  |
| Paragraph        | Text        |

{% table %}

- One {% align="middle" %}
- Two


---
- Three
- Four {% align="end" %}

---

* **Five**
*
  A bunch of words
  
  And more words

{% /table %}

{% table %}
---
- H1
- H2
{% /table %}
    `;
    const expected = `
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |

{% table %}
- One {% align="middle" %}
- Two
---
- Three
- Four {% align="end" %}
---
- **Five**
- A bunch of words

  And more words
{% /table %}

{% table %}
---
- H1
- H2
{% /table %}
`;

    check(source, expected);
    stable(expected);
  });

  it('tables with tags', () => {
    const source = `
{% table %}
* H1
* H2
{% if $var %}
---
* H3
* H4
{% /if %}
{% /table %}
    `;
    const expected = `
{% table %}
- H1
- H2
{% if $var %}
---
- H3
- H4
{% /if %}
{% /table %}
`;

    check(source, expected);
    stable(expected);
  });

  it('lists', () => {
    const source = `
- [Install Markdoc](/docs/getting-started)
- [Try it out online](/sandbox)

1. One {% align="left" %}
2. Two
3. Three

- A
- B
  - B2
- C`;
    const expected = `
- [Install Markdoc](/docs/getting-started)
- [Try it out online](/sandbox)

1. One {% align="left" %}
1. Two
1. Three

- A
- B
  - B2
- C
`;
    check(source, expected);
    stable(expected);
  });
  it('"loose" lists', () => {
    const source = `
- One

  My first paragraph
  Test

  {% tag %} 
    Indented tag
  {% /tag %} 

  \`\`\`
  {% $code %}
  \`\`\`

- Two

  My second paragraph
  
  ---
  
  ## Indented header

  > Indented blockquote`;
    const expected = `
- One

  My first paragraph
  Test

  {% tag %}
  Indented tag
  {% /tag %}

  \`\`\`
  {% $code %}
  \`\`\`
- Two

  My second paragraph

  ---

  ## Indented header

  > Indented blockquote
`;

    check(source, expected);
    stable(expected);
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
      {% /table %}
    1. foo\\
       baz
    
       Soft 
         break
       Markdoc uses…`;

    const expected = `
- Create your CNAME record

  1. Click **Add record**.
  1. Enter these values in the form that opens:

     {% table %}
     - Field
     - Value to enter
     - Description
     ---
     - Type
     - Select \`CNAME\` from the dropdown
     - What kind of DNS record this is.
     ---
     - Target
     - If your custom subdomain is checkout.powdur.me, enter \`checkout\`
     - For CNAME records, this field is the first part of your subdomain (the part leading up to the first period).
     ---
     - Value
     - {% code %}hosted-checkout.stripecdn.com{% /code %}
     - This is what the new subdomain record points to-in this case, Stripe Checkout.
     ---
     - TTL
     - \`5 min\`
     - An expiration of 5 minutes (300 seconds) is OK.
     ---
     - Proxy status
     - \`Off\`
     - Set the proxy status to \`off\` to avoid issues during setup.
     {% /table %}
  1. foo\\
     baz

     Soft
     break
     Markdoc uses…
`;

    check(source, expected);
    stable(expected);
  });

  it('fences with block level tags', () => {
    const source = `{% tab %}
\`\`\`json {% filename="package.json" %}
{
  "dependencies": {
    ...
    {% highlight type="remove" %}
    "beta": "1.2.3",
    {% /highlight %}
    {% highlight type="add" %}
    "main": "1.2.4",
    {% /highlight %}
    ...
  }
}
\`\`\`
{% /tab %}
`;

    check(source, source);
  });
});
