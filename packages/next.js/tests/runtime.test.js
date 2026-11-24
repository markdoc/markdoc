import { expect, test } from 'vitest';
import { getSchema } from '../dist/runtime';

test('names components in Pascal case', () => {
  const component = (name) => Object.assign(() => null, { displayName: name });
  const { tags, components } = getSchema({
    tags: {
      button: { render: component('button') },
      'special-button': { render: component('special-button') },
      sideBySide: { render: component('sideBySide') },
      sidebyside: { render: component('sidebyside') },
    },
  });

  expect(
    Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, v.render]))
  ).toEqual({
    button: 'Button',
    'special-button': 'SpecialButton',
    sideBySide: 'SideBySide',
    sidebyside: 'Sidebyside',
  });
  expect(components.SideBySide.displayName).toBe('sideBySide');
  expect(components.Sidebyside.displayName).toBe('sidebyside');
});
