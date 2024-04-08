import dynamic from './react';
import renderStatic from './static';
import Tag from '../../tag';

const React = {
  Fragment: 'fragment',
  createElement(name, attributes, ...children) {
    return { name, attributes, children };
  },
};

describe('React dynamic renderer', function () {
  it('rendering a null node', function () {
    const example = { name: 'h1', children: ['test', null] };
    const output = dynamic(example, React);
    expect(output).toDeepEqual({
      name: 'h1',
      attributes: null,
      children: ['test', null],
    });
  });

  it('rendering a tag', function () {
    const example = { name: 'h1', children: ['test'] };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering string and number child nodes', function () {
    const example = { name: 'h1', children: ['test ', 1] };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering nested tags', function () {
    const example = {
      name: 'div',
      children: [{ name: 'p', children: ['test'] }],
    };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering parallel tags', function () {
    const children = [
      { name: 'p', children: ['foo'] },
      { name: 'p', children: ['bar'] },
    ];

    const output = dynamic(children, React);
    expect(output).toDeepEqualSubset({ name: 'fragment', children });
  });

  it('rendering an external component', function () {
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const output = dynamic(example, React, { components });
    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  it('rendering with a custom tag resolution function', function () {
    function tagName(name, components) {
      return components.Foo;
    }
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const output = dynamic(example, React, {components, resolveTagName: tagName});

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  describe('attributes', function () {
    it('with an id attribute', function () {
      const example = {
        name: 'h1',
        attributes: { id: 'foo' },
        children: ['test'],
      };

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset(example);
    });

    it('with a class attribute', function () {
      const example = new Tag('h1', { class: 'foo bar' }, ['test']);

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset({
        name: 'h1',
        attributes: { className: 'foo bar' },
        children: ['test'],
      });
    });

    it('with a number attribute value', function () {
      const example = {
        name: 'h1',
        attributes: { 'data-foo': 42 },
        children: ['test'],
      };

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset(example);
    });
  });

  describe('rendering built-in nodes', function () {
    it('rendering a fenced code block', function () {
      const example = new Tag('pre', { class: 'code code-ruby' }, ['test']);

      const output = dynamic(example, React);
      expect(output).toDeepEqual({
        name: 'pre',
        attributes: { className: 'code code-ruby' },
        children: ['test'],
      });
    });
  });
});

describe('React static renderer', function () {
  it('rendering a null node', function () {
    const example = { name: 'h1', children: ['test', null] };
    const code = renderStatic(example);
    const output = eval(code)();

    expect(output).toDeepEqual({ ...example, attributes: null });
  });

  it('rendering a tag', function () {
    const example = { name: 'h1', children: ['test'] };
    const code = renderStatic(example);
    const output = eval(code)();
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering nested tags', function () {
    const example = {
      name: 'div',
      children: [{ name: 'p', children: ['test'] }],
    };
    const code = renderStatic(example);
    const output = eval(code)();
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering a fragment', function () {
    const example = [
      { name: 'p', children: ['foo'] },
      { name: 'p', children: ['bar'] },
    ];

    const code = renderStatic(example);
    const output = eval(code)();

    expect(output).toDeepEqual({
      name: 'fragment',
      attributes: null,
      children: [
        { name: 'p', attributes: null, children: ['foo'] },
        { name: 'p', attributes: null, children: ['bar'] },
      ],
    });
  });

  it('rendering an external component', function () {
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const code = renderStatic(example);
    const output = eval(code)({ components });

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  it('rendering with a custom tag resolution function', function () {
    function tagName(name, components) {
      return components.Foo;
    }
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const code = renderStatic(example, {resolveTagName: tagName});
    const output = eval(code)({ components });

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  describe('attributes', function () {
    it('with an id attribute', function () {
      const example = {
        name: 'h1',
        attributes: { id: 'foo' },
        children: ['test'],
      };

      const code = renderStatic(example);
      const output = eval(code)();

      expect(output).toDeepEqualSubset(example);
    });

    it('with a number attribute value', function () {
      const example = {
        name: 'h1',
        attributes: { 'data-foo': 42 },
        children: ['test'],
      };

      const code = renderStatic(example);
      const output = eval(code)();

      expect(output).toDeepEqualSubset(example);
    });
  });
});
