import Tag from './tag';

describe('Tag.isTag', function () {
  it('should detect when value is not a tag', () => {
    expect(Tag.isTag(undefined)).toBe(false);
    expect(Tag.isTag(null)).toBe(false);
    expect(Tag.isTag('')).toBe(false);
    expect(Tag.isTag(8)).toBe(false);
    expect(Tag.isTag(true)).toBe(false);
    expect(Tag.isTag([])).toBe(false);
    expect(Tag.isTag({ my: 'object' })).toBe(false);
  });

  it('should detect tags', () => {
    expect(Tag.isTag(new Tag('tag', {}, []))).toBe(true);
  });
});
