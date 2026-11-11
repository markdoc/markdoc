import Variable from './variable';

describe('variable', function () {
  const config = {
    variables: {
      foo: {
        bar: 'example',
        baz: [1, { qux: 'value' }, 2],
      },
    },
  };

  it('basic resolution', function () {
    const example = new Variable(['foo', 'bar']);
    const output = example.resolve(config);
    expect(output).toEqual('example');
  });

  it('resolution with a number in the path', function () {
    const example = new Variable(['foo', 'baz', 1, 'qux']);
    const output = example.resolve(config);
    expect(output).toEqual('value');
  });

  it('resolution with a function', function () {
    function variables(path) {
      expect(path).toDeepEqual(['foo', 'bar']);
      return 'example';
    }

    const example = new Variable(['foo', 'bar']);
    const output = example.resolve({ variables });
    expect(output).toEqual('example');
  });
});
