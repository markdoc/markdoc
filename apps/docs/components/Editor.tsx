'use client';

import type { Editor as CodeMirrorEditor, EditorChange, EditorConfiguration, Position, TextMarker } from 'codemirror';
import type { ValidateError } from '@markdoc/markdoc';

export type EditorProps = {
  code: string;
  onChange: (code: string) => void;
  options?: EditorConfiguration;
  errors: ValidateError[];
  cursor?: Position;
};
import React from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/addon/selection/mark-selection';
import './codemirror/markdoc';

export default function Editor({ code, onChange, options, errors, cursor }: EditorProps) {
  const ref = React.useRef<CodeMirrorEditor | null>(null);

  const codeMirrorOptions = React.useMemo(
    () => ({
      ...options,
      autofocus: Boolean(cursor),
      styleSelectedText: true,
      lineNumbers: true,
      theme: 'none',
      mode: 'markdoc',
      lineWrapping: true,
      screenReaderLabel: 'Markdoc sandbox'
    }),
    [options, cursor]
  );

  const onBeforeChange = React.useCallback(
    (editor: CodeMirrorEditor, meta: EditorChange, code: string) => onChange(code),
    [onChange]
  );

  React.useEffect(() => {
    if (errors.length) {
      const markers: TextMarker[] = [];
      const editor = ref.current;

      if (editor) {
        errors.forEach((error) => {
          try {
            if (!error.location) return;
            const from = {
              line: error.location.start.line - 1,
              ch: error.location.start.character ?? Infinity
            };
            const to = {
              line: error.location.end.line - 1,
              ch: error.location.end.character ?? Infinity
            };

            markers.push(
              editor.markText(from, to, {
                className: 'syntax-error',
                attributes: {
                  'data-title': error.error.message,
                  'aria-label': error.error.message
                }
              })
            );
          } catch (error) {
            console.error(error);
          }
        });
      }

      return () => markers.forEach((mark) => mark.clear());
    }
  }, [errors]);

  return (
    <>
      <CodeMirror
        value={code}
        options={codeMirrorOptions}
        onBeforeChange={onBeforeChange}
        editorDidMount={(editor) => {
          ref.current = editor;
        }}
        editorWillUnmount={() => {
          // react-codemirror2 leaves its DOM behind during Strict Mode remounts.
          ref.current?.getWrapperElement().remove();
          ref.current = null;
        }}
        cursor={cursor}
      />
      <style jsx>
        {`
          :global(.syntax-error) {
            position: relative;
            text-decoration: red wavy underline;
            text-decoration-skip-ink: none;
          }

          /* Tooltip */
          :global(.syntax-error::before) {
            content: attr(data-title);
            position: absolute;
            display: none;
            color: var(--black);
            background: var(--white);
            bottom: 20px;
            padding: 1px 4px;
            border-radius: 4px;
            z-index: 999;
            min-width: 240px;
          }

          /* Tooltip triangle */
          :global(.syntax-error::after) {
            content: '';
            position: absolute;
            display: none;
            bottom: 12px;
            left: 12px;
            border-width: 4px;
            border-style: solid;
            border-color: var(--white) transparent transparent transparent;
          }

          :global(.syntax-error:hover::before),
          :global(.syntax-error:hover::after) {
            display: inline-block;
          }
        `}
      </style>
    </>
  );
}
