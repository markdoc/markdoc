import Variable from '../../src/ast/variable';
import { parse, SyntaxError } from '../../src/grammar/tag';

describe('Markdoc tag parser', () => {
  describe('tag parsing', () => {
    it('with a simple opening tag', () => {
      const example = parse('foo');
      expect(example).toDeepEqual({
        type: 'tag_open',
        nesting: 1,
        meta: { tag: 'foo', attributes: null },
      });
    });

    it('with an opening tag that has attributes', () => {
      const example = parse('foo foo=1 bar=true');
      expect(example).toDeepEqual({
        type: 'tag_open',
        nesting: 1,
        meta: {
          tag: 'foo',
          attributes: [
            { type: 'attribute', name: 'foo', value: 1 },
            { type: 'attribute', name: 'bar', value: true },
          ],
        },
      });
    });

    it('with a self-closing tag', () => {
      const example = parse('foo /');
      expect(example).toDeepEqual({
        type: 'tag',
        nesting: 0,
        meta: { tag: 'foo', attributes: null },
      });
    });

    it('with a self-closing tag that has attributes', () => {
      const example = parse('foo foo=1 bar=true /');
      expect(example).toDeepEqual({
        type: 'tag',
        nesting: 0,
        meta: {
          tag: 'foo',
          attributes: [
            { type: 'attribute', name: 'foo', value: 1 },
            { type: 'attribute', name: 'bar', value: true },
          ],
        },
      });
    });

    it('with a closing tag', () => {
      const example = parse('/foo');
      expect(example).toDeepEqual({
        type: 'tag_close',
        nesting: -1,
        meta: { tag: 'foo' },
      });
    });

    it('with an invalid closing tag', () => {
      expect(() => parse('/foo/')).toThrowError(SyntaxError);
    });

    it('with an invalid closing tag that has attributes', () => {
      expect(() => parse('/foo test=1')).toThrowError(SyntaxError);
    });
  });

  describe('variable parsing', () => {
    it('with a simple variable', () => {
      const example = parse('$foo', { Variable });
      expect(example).toDeepEqual({
        type: 'variable',
        meta: { variable: new Variable(['foo'], null) },
      });
    });

    it('with multiple levels of depth', () => {
      const example = parse('$foo.bar.baz', { Variable });
      expect(example).toDeepEqual({
        type: 'variable',
        meta: { variable: new Variable(['foo', 'bar', 'baz'], null) },
      });
    });

    it('with an array index', () => {
      const example = parse('$foo[1]', { Variable });
      expect(example).toDeepEqual({
        type: 'variable',
        meta: { variable: new Variable(['foo', 1], null) },
      });
    });

    it('with multiple array indexes', () => {
      const example = parse('$foo[1][2]', { Variable });
      expect(example).toDeepEqual({
        type: 'variable',
        meta: { variable: new Variable(['foo', 1, 2], null) },
      });
    });

    it('with array indexes and properties', () => {
      const example = parse('$foo[1].bar.baz[2].test', { Variable });
      expect(example).toDeepEqual({
        type: 'variable',
        meta: {
          variable: new Variable(['foo', 1, 'bar', 'baz', 2, 'test'], null),
        },
      });
    });

    it('with an invalid array index', () => {
      expect(() => parse('$foo[asdf]', { Variable })).toThrowError(SyntaxError);
    });

    it('with an invalid namespace', () => {
      expect(() => parse('$.foo:bar.baz', { Variable })).toThrowError(
        SyntaxError,
      );
    });
  });

  describe('parsing attributes', () => {
    it('parsing annotation with a single attribute', () => {
      const example = parse('test=1');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'test', value: 1 },
      ]);
    });

    it('with an id', () => {
      const example = parse('#test');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'id', value: 'test' },
      ]);
    });

    it('with hyphens', () => {
      const example = parse('#test-1 .foo-bar');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'id', value: 'test-1' },
        { type: 'class', name: 'foo-bar', value: true },
      ]);
    });

    it('with chained classes', () => {
      const example = parse('.foo .bar');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'class', name: 'foo', value: true },
        { type: 'class', name: 'bar', value: true },
      ]);
    });

    it('with chained id and classes', () => {
      const example = parse('#test-1 .foo .bar');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'id', value: 'test-1' },
        { type: 'class', name: 'foo', value: true },
        { type: 'class', name: 'bar', value: true },
      ]);
    });

    it('with an invalid id', () => {
      expect(() => parse('#foo@bar.baz@test')).toThrowError(SyntaxError);
    });

    it('with key/value pairs', () => {
      const example = parse('foo="bar" baz=3 test=true');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'foo', value: 'bar' },
        { type: 'attribute', name: 'baz', value: 3 },
        { type: 'attribute', name: 'test', value: true },
      ]);
    });

    it('with shortcuts and key/value pairs', () => {
      const example = parse('#foo .bar test="asdf"', { Variable });
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'id', value: 'foo' },
        { type: 'class', name: 'bar', value: true },
        { type: 'attribute', name: 'test', value: 'asdf' },
      ]);
    });

    it('with boolean key/value pairs', () => {
      const example = parse('test=true foo=false bar=true');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'test', value: true },
        { type: 'attribute', name: 'foo', value: false },
        { type: 'attribute', name: 'bar', value: true },
      ]);
    });

    it('with null key/value pair', () => {
      const example = parse('foo=null');
      expect(example.meta.attributes).toDeepEqual([
        { type: 'attribute', name: 'foo', value: null },
      ]);
    });

    describe('with variables as values', () => {
      it('with a simple variable', () => {
        const example = parse('test=$foo', { Variable });
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'test',
            value: new Variable(['foo'], null),
          },
        ]);
      });

      it('with multiple levels of depth', () => {
        const example = parse('test=$foo.bar.baz', { Variable });
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'test',
            value: new Variable(['foo', 'bar', 'baz'], null),
          },
        ]);
      });

      it('with an array index', () => {
        const example = parse('test=$foo[1]', { Variable });
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'test',
            value: new Variable(['foo', 1], null),
          },
        ]);
      });

      it('with multiple array indexes', () => {
        const example = parse('test=$foo[1][2]', { Variable });
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'test',
            value: new Variable(['foo', 1, 2], null),
          },
        ]);
      });

      it('with array indexes and properties', () => {
        const example = parse('test=$foo[1].bar.baz[2].test', { Variable });
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'test',
            value: new Variable(['foo', 1, 'bar', 'baz', 2, 'test'], null),
          },
        ]);
      });

      it('with an invalid array index', () => {
        expect(() => parse('test=$foo[asdf]', { Variable })).toThrowError(
          SyntaxError,
        );
      });
    });

    describe('with complex values', () => {
      it('with a simple hash literal value', () => {
        const example = parse('foo={bar: true}');
        expect(example.meta.attributes).toDeepEqual([
          { type: 'attribute', name: 'foo', value: { bar: true } },
        ]);
      });

      it('with a nested hash literal value', () => {
        const example1 = parse(
          'foo={bar: true, baz: {test: "this is a test"}}',
        );
        const example2 = parse('foo={bar:true,baz:{test:"this is a test"}}');
        const expected = [
          {
            type: 'attribute',
            name: 'foo',
            value: {
              bar: true,
              baz: { test: 'this is a test' },
            },
          },
        ];

        expect(example1.meta.attributes).toDeepEqual(expected);
        expect(example2.meta.attributes).toDeepEqual(expected);
      });

      it('with a hash literal that has string keys', () => {
        const example = parse('foo={bar: true, "baz": 1}');
        expect(example.meta.attributes).toDeepEqual([
          { type: 'attribute', name: 'foo', value: { bar: true, baz: 1 } },
        ]);
      });

      it('with multiple hash literal values', () => {
        const example = parse('foo={bar: true} baz={test: "testing"}');
        expect(example.meta.attributes).toDeepEqual([
          { type: 'attribute', name: 'foo', value: { bar: true } },
          { type: 'attribute', name: 'baz', value: { test: 'testing' } },
        ]);
      });

      it('with an array literal value', () => {
        const example1 = parse('foo=[1, 2, 3]');
        const example2 = parse('foo=[1,2,3]');
        const expected = [{ type: 'attribute', name: 'foo', value: [1, 2, 3] }];

        expect(example1.meta.attributes).toDeepEqual(expected);
        expect(example2.meta.attributes).toDeepEqual(expected);
      });

      it('with nested array literal values', () => {
        const example1 = parse('foo=[1, 2, ["test", true, null]]');
        const example2 = parse('foo=[1,2,["test",true,null]]');
        const expected = [
          {
            type: 'attribute',
            name: 'foo',
            value: [1, 2, ['test', true, null]],
          },
        ];

        expect(example1.meta.attributes).toDeepEqual(expected);
        expect(example2.meta.attributes).toDeepEqual(expected);
      });

      it('with multiple nested array literal values', () => {
        const example = parse('foo=[1, 2, ["test", true, null]] bar=["baz"]');
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'foo',
            value: [1, 2, ['test', true, null]],
          },
          { type: 'attribute', name: 'bar', value: ['baz'] },
        ]);
      });

      it('with array and object literals', () => {
        const example = parse('foo=[1, 2, {bar: "baz", test: [1, 2, 3]}]');
        expect(example.meta.attributes).toDeepEqual([
          {
            type: 'attribute',
            name: 'foo',
            value: [1, 2, { bar: 'baz', test: [1, 2, 3] }],
          },
        ]);
      });
    });

    it('with an invalid value', () => {
      const examples = ['foo=bar', 'foo=a1', 'foo=1a'];
      for (const example of examples)
        expect(() => parse(example)).toThrowError(SyntaxError);
    });
  });
});
