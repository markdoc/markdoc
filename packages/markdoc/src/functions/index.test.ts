import Ast from '../ast';
import functions from './index';

describe('built-in functions', () => {
  describe('equals function', () => {
    it('true match with variable', () => {
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

    it('false match with variable', () => {
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
