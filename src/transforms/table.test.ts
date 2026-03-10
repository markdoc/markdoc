import Markdoc from '../../index';

function validate(string: string, config = {}) {
  return Markdoc.validate(Markdoc.parse(string), config);
}

describe('table transform validation', function () {
  it('produces an error for non-row content at the row level of a table', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
* Cell 1
* Cell 2
{% if $foo %}
This is invalid conditional content at the row level of the table.
{% /if %}
This is invalid non-conditional content at the row level.
{% /table %}`;

    const errors = validate(input);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    // One error for the paragraph inside the conditional (on the if tag),
    // one for the bare paragraph (on the table tag since the node is discarded)
    expect(tableSyntaxErrors.length).toBe(2);
    for (const err of tableSyntaxErrors) {
      expect(err.error.level).toBe('critical');
      expect(err.error.message).toContain('paragraph');
      expect(err.error.message).toContain('indented');
    }

    // The conditional error should point to the {% if %} tag, not the table
    const conditionalError = tableSyntaxErrors.find(
      (e) => e.type === 'tag' && e.location?.start.line !== 0
    );
    expect(conditionalError).toBeDefined();
    expect(conditionalError?.location?.start.line).toBeGreaterThan(0);

    // The row-level error should point to the table tag (paragraph is discarded)
    const rowLevelError = tableSyntaxErrors.find(
      (e) => e.location?.start.line === 0
    );
    expect(rowLevelError).toBeDefined();
  });

  it('does not produce errors for valid conditional rows', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
{% if $foo %}
* Row 1 Cell 1
* Row 1 Cell 2
{% /if %}
---
{% if $bar %}
* Row 2 Cell 1
* Row 2 Cell 2
{% else /%}
* Alt Row 2 Cell 1
* Alt Row 2 Cell 2
{% /if %}
{% /table %}`;

    const errors = validate(input);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors).toEqual([]);
  });

  it('does not produce errors for valid conditionals within a cell', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
* Cell 1
* Cell 2
  {% if $foo %}
  This is a conditional paragraph inside cell 2.
  {% else /%}
  This is an alternate paragraph inside cell 2.
  {% /if %}
{% /table %}`;

    const errors = validate(input);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors).toEqual([]);
  });

  it('does not produce errors for valid conditional with multiple rows and hr separators', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
{% if $foo %}
* Row 1 Cell 1
* Row 1 Cell 2
---
* Row 2 Cell 1
* Row 2 Cell 2
{% /if %}
{% /table %}`;

    const errors = validate(input);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors).toEqual([]);
  });

  it('does not produce errors for comments in a table', function () {
    function validateWithComments(string: string, config = {}) {
      const tokenizer = new Markdoc.Tokenizer({ allowComments: true });
      const tokens = tokenizer.tokenize(string);
      return Markdoc.validate(Markdoc.parse(tokens), config);
    }
    const input = `{% table %}
* Heading 1
* Heading 2
---
{% comment %}
comment row
{% /comment %}
* Cell 1
* Cell 2
---
{% if $foo %}
{% comment %}
comment inside conditional
{% /comment %}
* Row Cell 1
* Row Cell 2
{% /if %}
{% /table %}`;

    const errors = validateWithComments(input);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors).toEqual([]);
  });

  it('produces an error for invalid tags inside a table conditional', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
{% if $foo %}
{% callout %}
This is not a valid row
{% /callout %}
{% /if %}
{% /table %}`;

    const config = {
      tags: { callout: { render: 'div' } },
    };

    const errors = validate(input, config);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors.length).toBe(1);
    expect(tableSyntaxErrors[0].error.level).toBe('critical');
    expect(tableSyntaxErrors[0].error.message).toContain('tag callout');
  });

  it('produces an error for non-conditional tags at the row level of a table', function () {
    const input = `{% table %}
* Heading 1
* Heading 2
---
{% callout %}
This is not a valid row
{% /callout %}
{% /table %}`;

    const config = {
      tags: { callout: { render: 'div' } },
    };

    const errors = validate(input, config);
    const tableSyntaxErrors = errors.filter(
      (e) => e.error.id === 'table-syntax'
    );

    expect(tableSyntaxErrors.length).toBe(1);
    expect(tableSyntaxErrors[0].error.level).toBe('critical');
    expect(tableSyntaxErrors[0].error.message).toContain('tag');
  });
});
