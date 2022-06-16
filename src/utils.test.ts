import { findTagEnd, parseTags } from '../src/utils';

describe('Templating', function () {
  describe('parseTags', function () {
    it('simple example', function () {
      const example =
        'this is a {% foo blah="asdf" %}test{% /foo %} of template parsing';
      const output = parseTags(example);
      const expected = [
        { type: 'text', content: 'this is a ', start: 0, end: 9 },
        {
          type: 'tag_open',
          info: '{% foo blah="asdf" %}',
          start: 10,
          end: 30,
          nesting: 1,
          meta: {
            tag: 'foo',
            attributes: [{ name: 'blah', type: 'attribute', value: 'asdf' }],
          },
        },
        { type: 'text', content: 'test', start: 31, end: 34 },
        {
          type: 'tag_close',
          nesting: -1,
          meta: { tag: 'foo' },
          info: '{% /foo %}',
          start: 35,
          end: 44,
        },
        { type: 'text', content: ' of template parsing', start: 45, end: 64 },
      ];

      expect(output).toDeepEqualSubset(expected);
    });
  });

  describe('findTagEnd', function () {
    describe('inline tags', function () {
      it('in a heading', function () {
        const example = `# Testing {% #foo.bar baz=1 %}`;
        const end = findTagEnd(example, 0);
        expect(end).toEqual(28);
        expect(example[end]).toEqual('%');
      });

      it('with string', function () {
        const example = `# Testing {% #foo.bar baz="example" test=true %}`;
        const end = findTagEnd(example, 0);
        expect(end).toEqual(46);
        expect(example[end]).toEqual('%');
      });

      it('with object literal attribute value', function () {
        const example = `# Testing {% #foo.bar baz={test: 1, foo: {test: "asdf{"}} %}`;
        const end = findTagEnd(example, 0);
        expect(end).toEqual(58);
        expect(example[end]).toEqual('%');
      });

      it('in a simple container', function () {
        const end = findTagEnd('{% foo %}');
        expect(end).toEqual(7);
      });

      it('in a container with shortcuts', function () {
        const end = findTagEnd('{% foo .bar.baz#test %}');
        expect(end).toEqual(21);
      });

      it('in a container with a string attribute', function () {
        const end = findTagEnd('{% foo test="this is a test" %}');
        expect(end).toEqual(29);
      });

      it('for an invalid container', function () {
        const end = findTagEnd('{% foo .bar#baz');
        expect(end).toBeUndefined;
      });

      it('in a complex container', function () {
        const end = findTagEnd(
          '{% #foo .bar .baz test="this} is \\"{test}\\" a test" %} this is a test'
        );
        expect(end).toEqual(52);
      });
    });

    describe('multiline tags', function () {
      it('simple', function () {
        const example = `
        {% test #foo.bar
              baz=1 %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(46);
        expect(example[end]).toEqual('%');
      });

      it('with string', function () {
        const example = `
        {% test #foo.bar
              baz="this is a test"
              example=1 %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(85);
        expect(example[end]).toEqual('%');
      });

      it('with string and escaped quote', function () {
        const example = `
        {% test #foo.bar
              baz="this \\"is a test"
              example=1 %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(87);
        expect(example[end]).toEqual('%');
      });

      it('with string that has an opening brace', function () {
        const example = `
        {% test #foo.bar
              baz="this {is a test"
              example=1 %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(86);
        expect(example[end]).toEqual('%');
      });

      it('with string that has escapes and braces', function () {
        const example = `
        {% test #foo.bar
              baz="th\\"is {is a \\\\te\\"st"
              example=1 %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(92);
        expect(example[end]).toEqual('%');
      });

      it('with an object literal attribute value', function () {
        const example = `
        {% test #foo.bar
              foo={testing: "this } is a test", bar: {baz: 1}}
              example=1 another="test}" %}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(129);
        expect(example[end]).toEqual('%');
      });

      it('with an invalid object literal attribute value', function () {
        const example = `
        {test #foo.bar
              foo={testing: "this } is a test", bar: {baz: 1}
              example=1 another="test}"}
        `;

        const end = findTagEnd(example, 0);
        expect(end).toEqual(null);
      });
    });
    it("shouldn't hang when {% is included in code block", () => {
      const example = '```\n{%a %b %c}\n```';

      const output = parseTags(example);
      expect(output).toEqual([
        {
          type: 'text',
          start: 0,
          end: 17,
          content: '```\n{%a %b %c}\n```',
        },
      ]);
    });
  });
});
