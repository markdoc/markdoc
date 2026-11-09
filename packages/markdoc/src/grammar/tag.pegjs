{

const {Variable, Function} = options;

}

Top = TopLevelValue / Annotation / TagOpen / TagClose

TopLevelValue =
  variable:(Variable / Function) {
    return {type: 'variable', meta: {variable}}
  }

Annotation =
  attributes:TagAttributes _* {
  	return {type: 'annotation', meta: {attributes}}
  }
  
TagOpen =
  tag:TagName _*
  primary:(
    value:Value _? { return value; }
  )?
  attributes:TagAttributes? _*
  close:'/'? {
  	if (primary) {
      attributes = attributes || [];
      attributes.unshift({type: 'attribute', name: 'primary', value: primary});
    }

    const [type, nesting] = close ? ['tag', 0] : ['tag_open', 1];
  	return {type, nesting, meta: {tag, attributes}};
  }
  
TagClose =
  '/' tag:TagName { return {type: 'tag_close', nesting: -1, meta: {tag}}; }
  
TagName 'tag name' =
  name:Identifier

TagAttributes =
  head:TagAttributesItem
  tail:TagAttributesTail* {
    return !head ? [] : [head, ...tail];
  }

TagAttributesTail =
  _+ item:TagAttributesItem { return item; }
    
TagAttributesItem =
  ids:TagShortcutId { return ids } /
  classes:TagShortcutClass { return classes } /
  attribute:TagAttribute { return attribute }

TagShortcutClass 'class' =
  '.'
  name:Identifier {
    return {type: 'class', name, value: true};
  }

TagShortcutId 'id' =
  '#'
  value:Identifier {
    return {type: 'attribute', name: 'id', value};
  }

TagAttribute =
  name:Identifier
  '='
  value:Value {
  	return {type: 'attribute', name, value};
  }

Function =
  name:Identifier '(' _*
  params:(
    head:FunctionParameter?
    tail:FunctionParameterTail* { return head ? [head, ...tail] : []; }
  )?
  ')' {
    let parameters = {};
    for (let [index, {name, value}] of params.entries())
      parameters[name || index] = value;
    return new Function(name, parameters);
  }

FunctionParameter =
  name:(
    name:Identifier '=' { return name; }
  )?
  value:Value {
    return {name, value};
  }

FunctionParameterTail =
  _* ',' _* value:FunctionParameter { return value; }

TrailingComma = (_*',')?

Variable 'variable' =
  prefix:[$@]
  head:Identifier
  tail:VariableTail* {
    if (prefix === '@')
      return [head, ...tail];
    return new Variable([head, ...tail]);
  }

VariableTail =
  '.' name:Identifier { return name; } /
  '[' value:(ValueNumber / ValueString) ']' { return value; }

Value =
  ValueNull / ValueBoolean /
  ValueString / ValueNumber /
  ValueArray / ValueHash /
  Function / Variable 

ValueNull 'null' =
  'null' { return null; }

ValueBoolean 'boolean' =
  'true' { return true; } /
  'false' { return false; }

ValueArray =
  '[' _*
  value:(
    head:Value
    tail:ValueArrayTail*
    TrailingComma { return [head, ...tail]; }
  )?
  _* ']' { return value || []; }

ValueArrayTail =
  _* ',' _* value:Value { return value; }

ValueHash =
  '{' _*
  value:(
    head:ValueHashItem
    tail:ValueHashTail*
    TrailingComma { return Object.assign(head, ...tail); }
  )?
  _* '}' { return value || {}; }

ValueHashTail =
  _* ',' _* item:ValueHashItem { return item; }
    
ValueHashItem =
  key:(Identifier / ValueString)
  ':'
  _* value:Value { return key === "$$mdtype" ? {} : {[key]: value}; }

ValueNumber 'number' =
  '-'? [0-9]+ ('.'[0-9]+)? { return parseFloat(text()); }

ValueString 'string' =
  '"' value:ValueStringChars* '"' { return value.join(''); }

ValueStringChars = 
  [^\0-\x1F\x22\x5C] / ValueStringEscapes
    
ValueStringEscapes =
  '\\' sequence:(
    '"' /
    '\\' /
    'n' { return '\n' } /
    'r' { return '\r' } /
    't' { return '\t' }
  ) { return sequence; }

Identifier 'identifier' =
  $([a-zA-Z0-9_-]+)

_ 'whitespace' = [ \n\t]
