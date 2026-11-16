'use client';

import React from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/addon/selection/mark-selection';
import './codemirror/markdoc.js';

export default function Editor({ code, onChange, options, errors, cursor }) {
  const ref = React.useRef();

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
    (editor, meta, code) => onChange(code),
    [onChange]
  );

  React.useEffect(() => {
    if (errors.length) {
      const markers = [];
      const editor = ref.current;

      if (editor) {
        errors.forEach((error) => {
          try {
            const from = {
              line: error.location?.start.line - 1,
              ch: error.location?.start.character
            };
            const to = {
              line: error.location?.end.line - 1,
              ch: error.location?.end.character
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
