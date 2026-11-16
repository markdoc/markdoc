---
title: Functions
description: Functions let you extend Markdoc to run custom code.
---

# {% $markdoc.frontmatter.title %}

Functions enable you extend Markdoc with custom utilities, which let you transform your content and [variables](/docs/syntax#variables) at runtime.


## Built-in functions

Markdoc comes out-of-the-box with six built-in functions: `equals`, `and`, `or`, `not`, `default`, and `debug`.

{% table %}

- Function
- Returns
- Example
- Description

---

- `equals`
- `boolean`
- `equals($myString, 'test')`
- Performs common boolean operation

---

- `and`
- `boolean`
- `and($boolean1, $boolean2)`
- Performs common boolean operation

---

- `or`
- `boolean`
- `or($boolean1, $boolean2)`
- Performs common boolean operation

---

- `not`
- `boolean`
- `not(or($boolean1, $boolean2))`
- Performs common boolean operation

---

- `default`
- `mixed`
- `default($variable, true)`
- Returns the second parameter if the first parameter is `undefined`

---

- `debug`
- `string`
- `debug($anyVariable)`
- Serializes the value as JSON, for debugging

{% /table %}

### And/Or/Not

Use these functions with the `if` [tag](/docs/tags) to perform boolean operations and render the content when the condition is met.

{% callout type="warning" %}
Unlike JavaScript, Markdoc only considers `undefined`, `null`, and `false` to be falsey.
{% /callout %}

{% example %}

```
This is always shown
{% if and(not($a), or($b, $c)) %}
This is shown only if $a is falsy and either $b or $c is true.
{% /if %}
```

{% /example %}

### Equals

Use the `equals` function to compare a variable against a given value. This function uses JavaScript's strict equality semantics, and is only used for primitive types.

{% example %}

```
{% if equals($myVar, "test") %}
The variable $myVar is equal to the string "test".
{% /if %}
```

{% /example %}

### Default

This function is useful to set a value for a variable that might not exist.

{% example %}

```
{% if default($showPrompt, true) %}
Hey there!
{% /if %}
```

{% /example %}

### Debug

This function simply renders the value as a serialized JSON value in the document. This can be useful for determining what value is in a [variable](/docs/syntax#variables).

{% example %}

```
{% debug($myVar) %}
```

{% /example %}


## Creating a custom function

To extend Markdoc with your own functions, first create custom function definitions:

```js
const includes = {
  transform(parameters) {
    const [array, value] = Object.values(parameters);

    return Array.isArray(array) ? array.includes(value) : false;
  }
};

const uppercase = {
  transform(parameters) {
    const string = parameters[0];

    return typeof string === 'string' ? string.toUpperCase() : string;
  }
};
```

Then, pass the functions to your [`config` object](/docs/config).

```js
/** @type {import('@markdoc/markdoc').Config} */
const config = {
  functions: {
    includes,
    uppercase
  }
};

const content = Markdoc.transform(ast, config);
```

Finally, call the functions within your Markdoc content

{% example %}

```md
{% if includes($countries, "AR") %} 🇦🇷 {% /if %}
{% if includes($countries, "AU") %} 🇦🇺 {% /if %}
{% if includes($countries, "ES") %} 🇪🇸 {% /if %}
{% if includes($countries, "JP") %} 🇯🇵 {% /if %}
{% if includes($countries, "NG") %} 🇳🇬 {% /if %}
{% if includes($countries, "US") %} 🇺🇸 {% /if %}
```

{% /example %}

## Next steps

- [Validate your content](/docs/validation)
- [Render as HTML or React](/docs/render)
