/**
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import CodeMirror, { type EditorConfiguration, type Mode, type StringStream } from 'codemirror';
import 'codemirror/mode/xml/xml.js';

// Adapted from https://github.com/HlidacStatu/codemirror-mode-liquid/blob/master/liquid.js

type StateName = 'comment' | 'raw' | 'object' | 'tag' | 'string';
type State = {
  states: StateName[];
  indent: number;
  quoteKind: string | null;
  htmlState: unknown;
};
type MarkdocMode = Mode<State> & {
  innerMode(state: State): { state: unknown; mode: Mode<unknown> } | null;
  electricInput: RegExp;
  useInnerComments: boolean;
  fold: string;
};

CodeMirror.defineMode(
  'markdoc',
  function (config: EditorConfiguration): MarkdocMode {
    const indentUnit = config.indentUnit ?? 2;
    const indentation = { multilineTagIndentFactor: 2, multilineTagIndentPastTag: false };
    // This is a combination of Markdown and the Liquid templating engine
    // syntax's
    var htmlMode = CodeMirror.getMode(config, {
      name: 'text/markdown',
      ...indentation
    });
    // innerMode returns htmlMode after {%endcomment%} and {%endraw%} but we need to re-indent.
    var xmlMode = CodeMirror.getMode(config, {
      name: 'xml',
      htmlMode: true,
      ...indentation
    });
    xmlMode.electricInput = RegExp(
      xmlMode.electricInput!.source +
        /|^\s*{%-?\s*end(comment|raw)\s*-?%}$/.source
    );

    function last<T>(array: T[]): T | undefined {
      return array[array.length - 1];
    }

    function tokenUntil(stream: StringStream, state: State, untilRegExp: RegExp) {
      if (stream.sol()) {
        for (var indent = 0; indent < state.indent; indent++) {
          if (!stream.eat(/\s/)) break;
        }
        if (indent) return null;
      }
      var oldString = stream.string;
      var match = untilRegExp.exec(oldString.substr(stream.pos));
      if (match) {
        stream.string = oldString.substr(0, stream.pos + match.index);
      }
      var result = stream.hideFirstChars(state.indent, function () {
        return htmlMode.token(stream, state.htmlState);
      });
      stream.string = oldString;
      return result;
    }

    return {
      startState: function () {
        return {
          states: [],
          indent: 0,
          quoteKind: null,
          htmlState: CodeMirror.startState(htmlMode)
        };
      },

      copyState: function (state: State) {
        return {
          states: state.states.concat([]),
          indent: state.indent,
          quoteKind: state.quoteKind,
          htmlState: CodeMirror.copyState(htmlMode, state.htmlState)
        };
      },

      token: function (stream: StringStream, state: State) {
        let match: string[] | null;
        switch (last(state.states)) {
          case undefined:

            if (stream.match(/^{%-?\s*comment\s*-?%}/)) {
              state.indent += indentUnit;
              state.states.push('comment');
              return 'comment';
            } else if (stream.match(/^{%-?\s*raw\s*-?%}/)) {
              state.indent += indentUnit;
              state.states.push('raw');
              return 'keyword';
            } else if (stream.match(/^{{/)) {
              state.states.push('object');
              return 'keyword';
            } else if ((match = stream.match(/^{%-?\s*(\w*)/))) {
              if (match[1] == 'endcase')
                state.indent -= 2 * indentUnit;
              else if (/^end/.test(match[1]))
                state.indent -= indentUnit;
              else if (match[1] == 'case')
                state.indent += 2 * indentUnit;
              else if (/^(if|unless|for|tablerow)$/.test(match[1]))
                state.indent += indentUnit;
              state.states.push('tag');
              return 'keyword';
            }
            return tokenUntil(stream, state, /{{|{%/);

          case 'object':
          case 'tag':
            match = stream.match(/^['"]/);
            if (match) {
              state.states.push('string');
              state.quoteKind = match[0];
              return 'string';
            } else if (
              stream.match(last(state.states) == 'object' ? /^}}/ : /^%}/)
            ) {
              state.states.pop();
            } else {
              stream.next();
            }
            return 'keyword';

          case 'comment':
            if (stream.match(/^.*?{%-?\s*\/comment\s*-?%}/)) {
              state.indent -= indentUnit;
              state.states.pop();
            } else {
              stream.skipToEnd();
            }
            return 'comment';

          case 'raw':
            if (stream.match(/^{%-?\s*endraw\s*-?%}/)) {
              state.indent -= indentUnit;
              state.states.pop();
              return 'keyword';
            }
            return tokenUntil(stream, state, /{%-?\s*endraw\s*-?%}/);

          case 'string':
            match = stream.match(/^.*?(["']|\\[\s\S])/);
            if (!match) {
              stream.skipToEnd();
            } else if (match[1] == state.quoteKind) {
              state.quoteKind = null;
              state.states.pop();
            }
            return 'string';
        }
      },

      indent: function (state: State, textAfter: string, line: string) {
        var indent = state.indent,
          top = last(state.states);
        if (top == 'comment' && /^{%-?\s*endcomment\s*-?%}/.test(textAfter))
          indent -= indentUnit;
        else if (top == 'raw' && /^{%-?\s*endraw\s*-?%}/.test(textAfter))
          indent -= indentUnit;
        else if (top == undefined && /^{%-?\s*endcase/.test(textAfter))
          indent -= 2 * indentUnit;
        else if (top == undefined && /^{%-?\s*(when|end|els)/.test(textAfter))
          indent -= indentUnit;
        return indent + htmlMode.indent!(state.htmlState, textAfter, line);
      },

      innerMode: function (state: State) {
        if (state.states.length && last(state.states) != 'raw') return null;
        else return { state: state.htmlState, mode: htmlMode };
      },

      electricInput: /^\s*{%-?\s*(when|end|endcase|els)$/,
      blockCommentStart: '{% comment %}',
      blockCommentEnd: '{% /comment %}',
      useInnerComments: false,
      fold: 'indent'
    };
  },
  'xml'
);

CodeMirror.defineMIME('text/x-markdoc', 'markdoc');
