{% callout / %}

{% callout %}
Block tag with children paragraph.
{% /callout %}

{% callout type="warning" %}
Block tag with string attribute.
{% /callout %}

{% callout type="info" count=42 enabled=true %}
Block tag with multiple attributes.
{% /callout %}

Paragraph with {% inlineTag / %} inline self-closing tag.

Paragraph with {% inlineTag label="hello" %} inline tag content {% /inlineTag %}.
