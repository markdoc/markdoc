import render from './html';
import { RenderableTreeNode } from '../types';
import Tag from '../tag';

function tag(
  name: string,
  attributes: Record<string, any> = {},
  children: RenderableTreeNode[] = []
) {
  return new Tag(name, attributes, children);
}

describe('HTML renderer', function () {
  it('rendering a tag', function () {
    const example = render(tag('h1', undefined, ['test'])).trim();
    expect(example).toEqual('<h1>test</h1>');
  });

  it('rendering string child nodes', function () {
    const example = tag('h1', undefined, ['test ', '1']);
    expect(render(example)).toEqual('<h1>test 1</h1>');
  });

  it('rendering nested tags', function () {
    const example = tag('div', undefined, [tag('p', undefined, ['test'])]);

    expect(render(example)).toEqual('<div><p>test</p></div>');
  });

  it('rendering parallel tags', function () {
    const example = [
      tag('p', undefined, ['foo']),
      tag('p', undefined, ['bar']),
    ];

    expect(render(example)).toEqual('<p>foo</p><p>bar</p>');
  });

  it('rendering a tag with an invalid child', function () {
    const example = tag('div', undefined, ['test', { foo: 'bar' }]);

    expect(render(example)).toEqual('<div>test</div>');
  });

  it('rendering a void element', function () {
    const example = tag('hr');
    expect(render(example)).toEqual('<hr>');
  });

  it('rendering a tag with numeric children', function () {
    const content = tag('p', {}, [1]);

    const html = render(content);
    expect(html).toEqual('<p>1</p>');
  });

  it('lowercase attributes', function () {
    const content = tag('td', { colSpan: 2, rowSpan: 3 }, ['Data']);

    const html = render(content);
    expect(html).toEqual('<td colspan="2" rowspan="3">Data</td>');
  });

  describe('attributes', function () {
    it('with basic value', function () {
      const example = tag('foo', { bar: 'baz' });
      expect(render(example)).toEqual('<foo bar="baz"></foo>');
    });

    it('with an id attribute', function () {
      const example = tag('h1', { id: 'foo', test: 'bar' }, ['test']);
      expect(render(example)).toEqual('<h1 id="foo" test="bar">test</h1>');
    });

    it('with a number attribute value', function () {
      const example = tag('h1', { 'data-foo': 42 }, ['test']);
      expect(render(example)).toEqual('<h1 data-foo="42">test</h1>');
    });
  });
});
