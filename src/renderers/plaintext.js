const Markdoc = require('../../dist');

//
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

const maxLength = (a, b) => Math.max(a, b);

function* renderChildren(a) {
  for (const child of a.children) {
    yield* render(child);
  }
}

function* renderTableRow(items) {
  yield `| ${items.join(' | ')} |\n`;
}

function* renderVariable(a) {
  yield '{% ';
  yield '$';
  yield a.path.join('.');
  yield ' %}';
}

function* renderFunction(a) {
  yield '{% ';
  yield '';
  yield a.name;
  yield '(';
  yield Object.values(a.parameters)
    .map((value) => JSON.stringify(value))
    .join(', ');
  yield ')';
  yield ' %}';
}

function* renderNode(a) {
  switch (a.type) {
    case 'document': {
      if (a.attributes.frontmatter.length) {
        yield `---\n${a.attributes.frontmatter}\n---\n`;
        yield* renderChildren(a);
      }
      break;
    }
    case 'heading': {
      yield '\n';
      yield '#'.repeat(a.attributes.level || 1);
      yield ' ';
      yield* renderChildren(a);
      yield '\n';
      // TODO look at annotations here
      break;
    }
    case 'paragraph': {
      yield '\n';
      yield* renderChildren(a);
      yield '\n';
      break;
    }
    case 'inline': {
      yield* renderChildren(a);
      break;
    }
    case 'link': {
      yield '[';
      yield* render(a.attributes.href);
      yield ']';
      yield '(';
      yield* renderChildren(a);
      yield ')';
      break;
    }
    case 'text': {
      yield* render(a.attributes.content);
      break;
    }
    case 'blockquote': {
      yield '\n> ';
      yield* renderChildren(a.children[0]);
      yield '\n';
      break;
    }
    case 'hr': {
      yield '\n---\n';
      break;
    }
    case 'image': {
      yield '!';
      yield '[';
      yield* render(a.attributes.alt);
      yield ']';
      yield '(';
      yield* render(a.attributes.src);
      yield ')';
      break;
    }
    case 'fence': {
      yield '\n';
      yield '```';
      yield (a.attributes.language || '').toLowerCase();
      yield '\n';
      yield* renderChildren(a);
      yield '```';
      yield '\n';
      break;
    }
    case 'tag': {
      yield '\n';
      yield '{% ';
      yield a.tag;
      yield ' ';
      yield Object.entries(a.attributes)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      yield ' %}';
      yield '\n';
      yield* renderChildren(a);
      yield '\n';
      yield '{% /';
      yield a.tag;
      yield ' %}';
      yield '\n';
      break;
    }
    case 'list': {
      yield* renderChildren(a);
      break;
    }
    case 'item': {
      yield '- ';
      yield* renderChildren(a);
      yield '\n';
      break;
    }
    case 'strong': {
      yield '**';
      yield* renderChildren(a);
      yield '**';
      break;
    }
    case 'em': {
      yield '_';
      yield* renderChildren(a);
      yield '_';
      break;
    }
    case 'code': {
      yield '`';
      yield* render(a.attributes.content);
      yield '`';
      break;
    }
    case 'hardbreak': {
      yield '\\\n';
      break;
    }
    case 'softbreak': {
      yield '\n';
      break;
    }
    case 'table': {
      yield '\n';
      const table = [...renderChildren(a)];
      const [head, ...rows] = table;

      const max = table
        .map((arr) => arr.map((s) => s.length).reduce(maxLength))
        .reduce(maxLength);

      yield* renderTableRow(head.map((h) => h + ' '.repeat(max - h.length)));
      yield* renderTableRow(head.map(() => '-'.repeat(max)));
      for (const row of rows) {
        yield* renderTableRow(row.map((r) => r + ' '.repeat(max - r.length)));
      }
      break;
    }
    case 'thead': {
      const [head] = [...renderChildren(a)];
      yield head;
      break;
    }
    case 'tr': {
      yield [...renderChildren(a)];
      break;
    }
    case 'tbody':
    case 'td':
    case 'th': {
      yield* renderChildren(a);
      break;
    }
    default: {
      throw new Error(`Unimplemented: "${a.type}"`);
    }
  }
}

function* render(a) {
  switch (typeof a) {
    case 'boolean':
    case 'number':
    case 'string': {
      yield a.toString();
      break;
    }
    case 'object': {
      switch (a.$$mdtype) {
        case 'Function': {
          yield* renderFunction(a);
          break;
        }
        case 'Node':
          yield* renderNode(a);
          break;
        case 'Variable': {
          yield* renderVariable(a);
          break;
        }
        default:
          throw new Error(`Unimplemented: "${a.$$mdtype}"`);
      }
      break;
    }
    default:
      throw new Error(`Unimplemented: "${a.$$mdtype}"`);
  }
}

const d = [...render(ast)].join('');
console.log(d);
