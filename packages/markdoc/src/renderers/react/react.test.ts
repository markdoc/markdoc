import Tag from '../../tag';
import dynamic from './react';
import renderStatic from './static';

const React = {
  Fragment: 'fragment',
  createElement(name, attributes, ...children) {
    return { name, attributes, children };
  },
};

describe('React dynamic renderer', () => {
  it('rendering a null node', () => {
    const example = { name: 'h1', children: ['test', null] };
    const output = dynamic(example, React);
    expect(output).toDeepEqual({
      name: 'h1',
      attributes: null,
      children: ['test', null],
    });
  });

  it('rendering a tag', () => {
    const example = { name: 'h1', children: ['test'] };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering string and number child nodes', () => {
    const example = { name: 'h1', children: ['test ', 1] };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering nested tags', () => {
    const example = {
      name: 'div',
      children: [{ name: 'p', children: ['test'] }],
    };
    const output = dynamic(example, React);
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering parallel tags', () => {
    const children = [
      { name: 'p', children: ['foo'] },
      { name: 'p', children: ['bar'] },
    ];

    const output = dynamic(children, React);
    expect(output).toDeepEqualSubset({ name: 'fragment', children });
  });

  it('rendering an external component', () => {
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const output = dynamic(example, React, { components });
    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  it('rendering with a custom tag resolution function', () => {
    function tagName(_name, components) {
      return components.Foo;
    }
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const output = dynamic(example, React, {
      components,
      resolveTagName: tagName,
    });

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  describe('attributes', () => {
    it('with an id attribute', () => {
      const example = {
        name: 'h1',
        attributes: { id: 'foo' },
        children: ['test'],
      };

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset(example);
    });

    it('with a class attribute', () => {
      const example = new Tag('h1', { class: 'foo bar' }, ['test']);

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset({
        name: 'h1',
        attributes: { className: 'foo bar' },
        children: ['test'],
      });
    });

    it('with a number attribute value', () => {
      const example = {
        name: 'h1',
        attributes: { 'data-foo': 42 },
        children: ['test'],
      };

      const output = dynamic(example, React);
      expect(output).toDeepEqualSubset(example);
    });
  });

  describe('rendering built-in nodes', () => {
    it('rendering a fenced code block', () => {
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

describe('React static renderer', () => {
  it('rendering a null node', () => {
    const example = { name: 'h1', children: ['test', null] };
    const code = renderStatic(example);
    const output = eval(code)();

    expect(output).toDeepEqual({ ...example, attributes: null });
  });

  it('rendering a tag', () => {
    const example = { name: 'h1', children: ['test'] };
    const code = renderStatic(example);
    const output = eval(code)();
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering nested tags', () => {
    const example = {
      name: 'div',
      children: [{ name: 'p', children: ['test'] }],
    };
    const code = renderStatic(example);
    const output = eval(code)();
    expect(output).toDeepEqualSubset(example);
  });

  it('rendering a fragment', () => {
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

  it('rendering an external component', () => {
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const code = renderStatic(example);
    const output = eval(code)({ components });

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  it('rendering with a custom tag resolution function', () => {
    function tagName(_name, components) {
      return components.Foo;
    }
    const components = { Foo: 'bar' };
    const example = new Tag('Foo', undefined, ['test']);
    const code = renderStatic(example, { resolveTagName: tagName });
    const output = eval(code)({ components });

    expect(output).toDeepEqualSubset({
      name: 'bar',
      children: ['test'],
    });
  });

  describe('attributes', () => {
    it('with an id attribute', () => {
      const example = {
        name: 'h1',
        attributes: { id: 'foo' },
        children: ['test'],
      };

      const code = renderStatic(example);
      const output = eval(code)();

      expect(output).toDeepEqualSubset(example);
    });

    it('with a number attribute value', () => {
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
