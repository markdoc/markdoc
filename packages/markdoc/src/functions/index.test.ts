import functions from './index';
import Ast from '../ast';

describe('built-in functions', function () {
  describe('equals function', function () {
    it('true match with variable', function () {
      const example = new Ast.Function('equals', {
        0: new Ast.Variable(['foo']),
        1: 'bar',
      });

      const output = example.resolve({
        functions,
        variables: { foo: 'bar' },
      });

      expect(output).toBeTrue();
    });

    it('false match with variable', function () {
      const example = new Ast.Function('equals', {
        0: new Ast.Variable(['foo']),
        1: 'bar',
      });

      const output = example.resolve({
        functions,
        variables: { foo: 'baz' },
      });

      expect(output).toBeFalse();
    });
  });
});
