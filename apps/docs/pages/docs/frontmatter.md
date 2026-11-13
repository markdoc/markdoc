---
title: Frontmatter
description:
---

# {% $markdoc.frontmatter.title %}

Use frontmatter to apply page-level metadata to Markdoc documents, like `title` and `description`. Markdoc doesn't have an opinion about how you format your frontmatter, you can use YAML, TOML, JSON, GraphQL—pretty much any data format you want.

## Examples

While not a comprehensive list, the examples below give you an idea of how you can structure frontmatter in various formats.

### YAML

```yaml
---
title: Authoring in Markdoc
description: Quickly author amazing content with Markdoc syntax, a superset of Markdown.
date: 2022-04-01
---
```

### TOML

```toml
---
title       = "Authoring in Markdoc"
description = "Quickly author amazing content with Markdoc syntax, a superset of Markdown."
date        = "2022-04-01"
---
```

### JSON

```json
---
{
  "title": "Authoring in Markdown",
  "description": "Quickly author amazing content with Markdoc syntax, a superset of Markdown.",
  "date": "2022-04-01"
}
---
```

### GraphQL

```graphql
---
{
  page {
    title
    description
    date
  }
}
---
```

## Access frontmatter values

To access frontmatter content in your document, you have to pass the values to Markdoc as [variables](/docs/variables).

### Parse the document

Parse your document to access the frontmatter content:

{% example %}

```js
const doc = `
---
title: My title
---

# {% $frontmatter.title %} 
`;

const ast = Markdoc.parse(doc);
```

{% /example %}

### Parse the frontmatter

Parse the frontmatter attribute using your preferred format and pass it in the `variables` field of your [`config` object](/docs/config).

```js
import yaml from 'js-yaml'; // or 'toml', etc.

const frontmatter = ast.attributes.frontmatter
  ? yaml.load(ast.attributes.frontmatter)
  : {};

/** @type {import('@markdoc/markdoc').Config} */
const config = {
  variables: {
    frontmatter
  }
};
```

### Use frontmatter values

After passing the parsed frontmatter to `variables`, you can access the values using `$frontmatter`:

{% sideBySide %}

{% example %}

```md
# {% $frontmatter.title %}
```

{% /example %}

# {% $markdoc.frontmatter.title %}

{% /sideBySide %}
