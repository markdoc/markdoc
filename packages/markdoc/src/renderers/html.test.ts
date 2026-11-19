import { describe, expect, it } from 'vitest';
import Markdoc from '../../index';
import Tag from '../tag';
import type { RenderableTreeNode } from '../types';
import render from './html';

function tag(
  name: string,
  attributes: Record<string, any> = {},
  children: RenderableTreeNode[] = [],
) {
  return new Tag(name, attributes, children);
}

describe('HTML renderer', () => {
  it('rendering a tag', () => {
    const example = render(tag('h1', undefined, ['test'])).trim();
    expect(example).toEqual('<h1>test</h1>');
  });

  it('rendering string child nodes', () => {
    const example = tag('h1', undefined, ['test ', '1']);
    expect(render(example)).toEqual('<h1>test 1</h1>');
  });

  it('rendering nested tags', () => {
    const example = tag('div', undefined, [tag('p', undefined, ['test'])]);

    expect(render(example)).toEqual('<div><p>test</p></div>');
  });

  it('rendering parallel tags', () => {
    const example = [
      tag('p', undefined, ['foo']),
      tag('p', undefined, ['bar']),
    ];

    expect(render(example)).toEqual('<p>foo</p><p>bar</p>');
  });

  it('rendering a tag with an invalid child', () => {
    const example = tag('div', undefined, ['test', { foo: 'bar' }]);

    expect(render(example)).toEqual('<div>test</div>');
  });

  it('rendering a void element', () => {
    const example = tag('hr');
    expect(render(example)).toEqual('<hr>');
  });

  it('rendering a tag with numeric children', () => {
    const content = tag('p', {}, [1]);

    const html = render(content);
    expect(html).toEqual('<p>1</p>');
  });

  it('lowercase attributes', () => {
    const content = tag('td', { colSpan: 2, rowSpan: 3 }, ['Data']);

    const html = render(content);
    expect(html).toEqual('<td colspan="2" rowspan="3">Data</td>');
  });

  describe('attributes', () => {
    it('with basic value', () => {
      const example = tag('foo', { bar: 'baz' });
      expect(render(example)).toEqual('<foo bar="baz"></foo>');
    });

    it('with an id attribute', () => {
      const example = tag('h1', { id: 'foo', test: 'bar' }, ['test']);
      expect(render(example)).toEqual('<h1 id="foo" test="bar">test</h1>');
    });

    it('with a number attribute value', () => {
      const example = tag('h1', { 'data-foo': 42 }, ['test']);
      expect(render(example)).toEqual('<h1 data-foo="42">test</h1>');
    });

    it('with null and undefined attribute values', () => {
      const example = tag('p', { a: null, b: undefined, c: false }, ['test']);
      expect(render(example)).toEqual('<p c="false">test</p>');
    });

    it('with an invalid attribute name', () => {
      const example = tag('p', { 'a>b': 1, 'x y': 2, 'a=b': 3, ok: 4 }, [
        'test',
      ]);
      expect(render(example)).toEqual('<p ok="4">test</p>');
    });
  });

  describe('tag names', () => {
    it('with a custom element name', () => {
      const example = tag('my-element', undefined, ['test']);
      expect(render(example)).toEqual('<my-element>test</my-element>');
    });

    it('with an invalid tag name', () => {
      const names = ['h1>x', 'a b', '1a', 'a/b'];
      for (const name of names) {
        const example = tag(name, { id: 'foo' }, ['test']);
        expect(render(example)).toEqual('test');
      }
    });

    it('with an invalid nested tag name', () => {
      const example = tag('div', undefined, [tag('p>x', undefined, ['test'])]);
      expect(render(example)).toEqual('<div>test</div>');
    });
  });

  it('rendering a heading with an invalid level annotation', () => {
    const source = '# Heading {% level="1>x" %}';
    const html = render(Markdoc.transform(Markdoc.parse(source)));
    expect(html).toEqual('<article><h1>Heading </h1></article>');
  });
});
