package markdoc

// Builds configs from fixture data, mirroring scripts/configs.mjs.

import (
	"encoding/json"
	"fmt"
	"regexp"
)

func configFromData(raw json.RawMessage) (*Config, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	decoded, err := decodeJS(raw)
	if err != nil {
		return nil, err
	}
	data := decoded.(*OrderedMap)
	hooks := testHooks()
	hook := func(v any) (any, error) {
		m, ok := v.(*OrderedMap)
		if !ok || !m.Has("$hook") {
			return nil, fmt.Errorf("not a hook: %v", v)
		}
		h, ok := hooks[m.Get("$hook").(string)]
		if !ok {
			return nil, fmt.Errorf("unknown hook: %v", m.Get("$hook"))
		}
		return h, nil
	}

	attrType := func(v any) (AttributeType, error) {
		switch v := v.(type) {
		case string:
			return primitiveType(v), nil
		case []any:
			var types []AttributeType
			for _, x := range v {
				types = append(types, primitiveType(x.(string)))
			}
			return Union(types...), nil
		}
		h, err := hook(v)
		if err != nil {
			return nil, err
		}
		return h.(AttributeType), nil
	}

	attributes := func(v any) ([]SchemaAttribute, error) {
		out := []SchemaAttribute{}
		m := v.(*OrderedMap)
		for _, name := range m.Keys() {
			a := SchemaAttribute{Name: name}
			spec := m.Get(name).(*OrderedMap)
			for _, k := range spec.Keys() {
				x := spec.Get(k)
				var err error
				switch k {
				case "type":
					a.Type, err = attrType(x)
				case "render":
					switch r := x.(type) {
					case bool:
						a.NoRender = !r
					case string:
						a.Render = r
					}
				case "default":
					a.Default = x
				case "required":
					a.Required = x.(bool)
				case "errorLevel":
					a.ErrorLevel = Level(x.(string))
				case "matches":
					if list, ok := x.([]any); ok {
						a.Matches = MatchList(list...)
					} else {
						re := x.(*OrderedMap)
						flags, _ := re.Get("flags").(string)
						pattern := re.Get("regex").(string)
						if flags != "" {
							pattern = "(?" + flags + ")" + pattern
						}
						a.Matches = MatchRegexp(regexp.MustCompile(pattern))
					}
				case "validate":
					var h any
					h, err = hook(x)
					if err == nil {
						a.Validate = h.(func(any, *Config, string) []ValidationError)
					}
				default:
					err = fmt.Errorf("unknown attribute key %q", k)
				}
				if err != nil {
					return nil, err
				}
			}
			out = append(out, a)
		}
		return out, nil
	}

	schemas := func(v any, builtins map[string]*Schema) (map[string]*Schema, error) {
		out := map[string]*Schema{}
		m := v.(*OrderedMap)
		for _, name := range m.Keys() {
			spec, ok := m.Get(name).(*OrderedMap)
			if !ok {
				out[name] = nil
				continue
			}
			s := &Schema{}
			if base, ok := spec.Get("extends").(string); ok {
				copied := *builtins[base]
				s = &copied
			}
			for _, k := range spec.Keys() {
				x := spec.Get(k)
				var err error
				switch k {
				case "extends":
				case "render":
					s.Render = x.(string)
				case "children":
					s.Children = []string{}
					for _, c := range x.([]any) {
						s.Children = append(s.Children, c.(string))
					}
				case "selfClosing":
					s.SelfClosing = x.(bool)
				case "inline":
					s.Inline = new(x.(bool))
				case "attributes":
					s.Attributes, err = attributes(x)
				case "slots":
					s.Slots = nil
					slots := x.(*OrderedMap)
					for _, slotName := range slots.Keys() {
						slot := SchemaSlot{Name: slotName}
						slotSpec := slots.Get(slotName).(*OrderedMap)
						switch r := slotSpec.Get("render").(type) {
						case bool:
							slot.NoRender = !r
						case string:
							slot.Render = r
						}
						slot.Required, _ = slotSpec.Get("required").(bool)
						s.Slots = append(s.Slots, slot)
					}
				case "transform":
					var h any
					if h, err = hook(x); err == nil {
						s.Transform = h.(func(*Node, *Config) (any, error))
					}
				case "validate":
					var h any
					if h, err = hook(x); err == nil {
						s.Validate = h.(func(*Node, *Config) []ValidationError)
					}
				default:
					err = fmt.Errorf("unknown schema key %q", k)
				}
				if err != nil {
					return nil, err
				}
			}
			out[name] = s
		}
		return out, nil
	}

	config := &Config{}
	for _, k := range data.Keys() {
		v := data.Get(k)
		var err error
		switch k {
		case "tags":
			config.Tags, err = schemas(v, Tags)
		case "nodes":
			config.Nodes, err = schemas(v, Nodes)
		case "variables":
			config.Variables = map[string]any{}
			vars := v.(*OrderedMap)
			for _, name := range vars.Keys() {
				config.Variables[name] = vars.Get(name)
			}
		case "partials":
			config.Partials = map[string]*Node{}
			partials := v.(*OrderedMap)
			for _, file := range partials.Keys() {
				config.Partials[file] = Parse(partials.Get(file).(string), WithFile(file))
			}
		case "functions":
			config.Functions = map[string]*ConfigFunction{}
			fns := v.(*OrderedMap)
			for _, name := range fns.Keys() {
				fn := &ConfigFunction{}
				spec := fns.Get(name).(*OrderedMap)
				for _, fk := range spec.Keys() {
					x := spec.Get(fk)
					switch fk {
					case "returns":
						fn.Returns, err = attrType(x)
					case "parameters":
						fn.Parameters, err = attributes(x)
					case "transform":
						var h any
						if h, err = hook(x); err == nil {
							fn.Transform = h.(func(*OrderedMap, *Config) (any, error))
						}
					case "validate":
						var h any
						if h, err = hook(x); err == nil {
							fn.Validate = h.(func(*Function, *Config) []ValidationError)
						}
					default:
						err = fmt.Errorf("unknown function key %q", fk)
					}
					if err != nil {
						return nil, err
					}
				}
				config.Functions[name] = fn
			}
		case "validation":
			validation := v.(*OrderedMap)
			config.Validation.ValidateFunctions, _ = validation.Get("validateFunctions").(bool)
			config.Validation.Environment, _ = validation.Get("environment").(string)
		default:
			err = fmt.Errorf("unknown config key %q", k)
		}
		if err != nil {
			return nil, err
		}
	}
	return config, nil
}
