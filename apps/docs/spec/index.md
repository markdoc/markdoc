# Markdoc tag syntax specification

<table>
<tbody>
<tr>
  <th><strong>Version:<strong></th>
  <td>0.1.0 Draft</td>
</tr>
<tr>
  <th><strong>Author:</strong></th>
  <td>Ryan Paul</td>
</tr>
</tbody>
</table>

Markdoc is a Markdown-based document format and a framework for content publishing. Markdoc extends Markdown with a custom syntax for tags and annotations, providing a way to tailor content to individual users and introduce interactive elements. This specification describes the syntax of Markdoc tags and how to parse them within Markdown content.

NOTE: This specification is an early draft and is still largely a work in progress. 

# Tags

TagStart :: `{%`

TagEnd :: `%}`

TagInterior :: one of
- TagOpen
- TagSelfClosing
- TagClose

Tag :: TagStart Space* TagInterior TagEnd

A Markdoc {Tag} is a piece of markup that applies custom behavior or formatting in a Markdoc document. Tags can be nested, making it possible to express hierarchy or apply custom formatting to enclosed children. Matched pairs of opening tags and closing tags signify the beginning and end of a tag element that encloses children.

```example
{% example %}
This paragraph is nested within a Markdoc tag.
{% /example %}
```

Tags can also be self-closing, containing no nested content:

```example
{% example /%}
```

:: The *tag delimiters* ({TagStart} and {TagEnd}) indicate the presence of a Markdoc tag within Markdown content. Characters within the delimiters are treated as the {TagInterior}. When a {TagStart} delimiter is detected in a Markdown document, the parser should scan forward until it finds the first {TagEnd} delimiter that is not enclosed within a {ValueString} in order to determine where the tag ends.

Determining what behavior and formatting is applied by a given Markdoc tag and its attributes is left to individual Markdoc implementations.

## Opening tag

PrimaryAttribute :: Space+ Value

AttributeItem :: Space+ Attribute

TagOpen :: Identifier PrimaryAttribute? AttributeItem* Space* 

:: An *opening tag* indicates the start of a Markdoc tag element that contains nested children. An opening tag's {TagInterior} must include the name of the tag and can include zero or more tag attributes.

A tag may optionally have an unnamed {PrimaryAttribute} value following the {Identifier}:

```example
{% if $foo %}
This is a paragraph in an `if` tag.
{% /if %}
```

## Self-closing tag

TagSelfClosing :: TagOpen `/` 

:: A *self-closing tag*, indicated by a forward-slash at the end of the {TagInterior}, indicates a Markdoc tag element that does not contain nested children. A self-closing tag's {TagInterior} must include the name of the tag and can include zero or more tag attributes. 

## Closing tag

TagClose :: `/` Identifier Space* 

:: A *closing tag*, indicated by a forward-slash at the start of the {TagInterior}, indicates the end of a Markdoc tag element that contains nested children. A closing tag's {TagInterior} may include include the name of the tag and optional trailing whitespace. A closing tag corresponds to the most recent *opening tag* that has the same tag name.

NOTE: A future draft will specify the expected parsing behavior for malformed documents with mismatched opening and closing tags.

## Tag forms

Markdoc tags can be used as either [block or inline](https://spec.commonmark.org/0.30/#blocks-and-inlines) elements in a Markdown document.

### Block form

A tag should be parsed as a block-level element when its opening and closing markers each appear on a line by themselves with no other characters except whitespace. In the following example, the tag `foo` should be parsed as a block-level element that contains a single paragraph:

```example
{% foo %}
This is content inside of a block-level tag
{% /foo %}
```

### Inline form

When the *opening tag* and *closing tag* appear on the same line within a paragraph, the tag should be treated as an inline document element nested inside of the block-level paragraph element:

```example
This is a paragraph {% foo %}that contains a tag{% /foo %}
```

When the *opening tag* and *closing tag* appear on the same line with no other surrounding content, the tag should still be treated as an inline document element, nested within an implied block-level paragraph element:

```example
{% foo %}This is content inside of an inline tag{% /foo %}
```

## Annotation

Annotation :: TagBegin Space* Attribute* Space* TagEnd

An {Annotation} applies {Attribute}s to the enclosing Markdown block. The attributes within the annotation are treated as though they are attributes on the document node itself. For example, an annotation can be used to add a CSS class to a heading node:

```example
# Heading {% .example %}
```

An {Annotation} may only be used as an inline document node. When an annotation appears on a line by itself, it is treated as though it is nested in a block-level paragraph element. Within an {Annotation}, each {Attribute} is separated by a space. 

## Attributes

Attribute :: one of
- AttributeFull
- AttributeShorthand

AttributeFull :: Identifier `=` Value

There are two types of attributes: full attributes ({AttributeFull}) and shorthand attributes ({AttributeShorthand}).

A full {Attribute} is a key-value pair that consists of an {Identifier} and a {Value} separated by an {`=`} sign. The {Identifier} serves as the {Attribute}'s key. No whitespace is permitted between the tokens that make up an {Attribute}.

```example
{% foo="bar" baz=[1, 2, 3] %}
```

### Shorthand attribute

AttributeShorthand :: ShorthandSigil Identifier

ShorthandSigil :: one of `#` `.`

A shorthand attribute consists of a {ShorthandSigil} followed by an {Identifier}. The sigil represents the attribute's key. The following table describes the attribute key represented by each sigil:

Sigil | Key
-|-
{`#`} | `id`
{`.`} | `class`

A shorthand attribute is equivalent to a full attribute that uses the key represented by the sigil. The following examples produce the same output:

```example
{% #foo .bar %}
```

```example
{% id="foo" class="bar" %}
```

When there are multiple shorthand attributes that use the class sigil ({`.`}), the parser combines them into a single `class` attribute. The following examples are equivalent:

```example
{% .foo .bar .baz %}
```

```example
{% class="foo bar baz" %}
```

# Interpolation

Interpolation :: `{%` Space* InterpolationValue Space* `%}`

InterpolationValue :: one of
- Function
- Variable

{Interpolation} is used to insert a Markdoc variable or the return value of a Markdoc function into the text of the Markdown document. Interpolation can only be used inside of an inline document node. When an interpolation appears on a line by itself, it is implicitly nested as inline content within a paragraph.

```example
Hello {% $username %}
```

# Values

Value :: one of
- PrimitiveValue
- CompoundValue
- Variable
- Function


## Primitive values

PrimitiveValue :: one of
- ValueNull
- ValueBoolean
- ValueNumber
- ValueString

### Null

ValueNull :: `null`

A null value is represented with the keyword {null}.

### Boolean

ValueBoolean :: one of
- `true`
- `false`

### Number

ValueNumber :: `-`? Digit+ Fraction?

Digit :: /[0-9]/

Fraction :: `.` Digit+

### String

ValueString :: `"` StringElement* `"`

StringElement :: one of
- StringCharacter
- StringEscapeSequence

StringEscapeSequence :: `\` StringEscapeCharacter

StringEscapeCharacter :: one of `"` `\` `n` `r` `t`

StringCharacter :: "any character" but not `"` or `\`

## Compound values

CompoundValue :: one of
- ValueArray
- ValueHash

### Array

ValueArray ::
  `[` Space* ArrayItem* ArrayItemWithOptionalComma? Space* `]`

ArrayItem :: Value Space* `,` Space*

ArrayItemWithOptionalComma :: Value Space* `,`?

An array value ({ValueArray}) consists of a matched pair of square brackets containing a comma-delimited sequence of {Value}s. A matched pair of square brackets that contains nothing or only whitespace is parsed as an empty array value. An optional trailing comma is permitted within non-empty arrays. Arrays may be nested to an infinite level of depth and may contain Markdoc {Variable}s or {Function} invocations.

```example
{% foo=[1, false, ["bar", $baz]] %}
```

### Hash 

ValueHash ::
  `{` Space* HashItem* HashItemWithOptionalComma? Space* `}`

HashItem :: HashKeyValue `,` Space*

HashKeyValue :: HashKey `:` Space* Value Space*

HashItemWithOptionalComma :: HashKeyValue `,`?

HashKey :: one of
- Identifier
- String

A hash value ({ValueHash}) consists of a matched pair of curly braces containing a comma-delimited sequence of key-value pairs ({HashKeyValue}). A matched pair of curly braces that contains nothing or only whitespace is parsed as an empty hash value. An optional trailing comma is permitted within non-empty hashes. Hashes may be nested to an infinite level of depth and may contain Markdoc {Variable}s or {Function} invocations as values. The {HashKey} may consist of either a bare identifier or a string surrounded by double quotes.

```example
{% foo={key: "example value", "quoted key": $variable} %}
```

## Variable

Variable :: VariableSigil Identifier VariableTail*

VariableTail :: one of
- `.` Identifier
- `[` VariableSegmentValue `]`

VariableSegmentValue :: one of
- ValueNumber
- ValueString
- Variable

VariableSigil :: one of `$` `@`

A {Variable} allows Markdoc content to incorporate an external value. Variables may be used for {Interpolation} or in place of a value in tag attributes. Variables consist of multiple segments, which are intended to support accessing a value that is deeply nested in a complex data structure. A {Variable} segment can be an identifier or a square-bracket enclosed value. Determining how to resolve a {Variable} into a value is left up to individual Markdoc implementations.

```example
{% foo=$bar.baz[10].qux %}
```

Note: A future draft will specify the expected behavior of variables with the `$` and `@` sigils. Presently, the `$` sigil should be treated as a conventional variable and the `@` sigil is reserved for future use.

## Function

Function :: Identifier `(` Space* FunctionParameters* Space* `)`

FunctionParameters :: Value FunctionParameterTail*

FunctionParameterTail :: Space* `,` Space* FunctionParameter

FunctionParameter :: one of
  - FunctionParameterNamed
  - Value

FunctionParameterNamed :: Identifier `=` Value

A function consists of an {Identifier} followed by {FunctionParameters} enclosed in parentheses. Functions are used to incorporate external logic in a Markdoc document. 

A {FunctionParameter} may be either a {Value} or a key-value pair separated by an equals sign. Functions may be used for {Interpolation} or in place of a value in tag attributes. Function parameters may be any valid {Value}, including a {Variable} or another {Function}. Determining how to evaluate a {Function} is left up to individual Markdoc implementations. 

NOTE: A future draft will specify a default set of built-in functions that should be included in Markdoc implementations.

# Space

Space :: one of
- "Space (U+0020)"
- "Horizontal Tab (U+0009)"
- "New Line (U+000A)"

# Identifier

Identifier :: /[a-zA-Z]/ IdentifierTail*

IdentifierTail :: /[-_a-zA-Z0-9]/
