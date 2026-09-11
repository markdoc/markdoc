import type MarkdownIt from 'markdown-it';
import type AstVariable from '../ast/variable';
import type AstFunction from '../ast/function';

type Token = MarkdownIt.Token;

type astTypes = {
  Variable?: typeof AstVariable;
  Function?: typeof AstFunction;
};

export function parse(input: string, astTypes?: astTypes): Token;

type PegLocation = {
  offset: number;
  line: number;
  column: number;
};

export interface SyntaxError extends Error {
  location: {
    start: PegLocation;
    end: PegLocation;
  };
}
