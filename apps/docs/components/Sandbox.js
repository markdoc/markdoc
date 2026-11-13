import React from 'react';
import { useRouter } from 'next/router';
import Markdoc from '@markdoc/markdoc';
import { getSchema } from '@markdoc/next.js/runtime';
import { ObjectDisplay } from './ObjectDisplay';

import * as tags from '../markdoc/tags';
import * as nodes from '../markdoc/nodes';
import * as functions from '../markdoc/functions';

const schema = {
  tags,
  nodes,
  functions
};

const INITIAL_CODE = `---
title: What is Markdoc?
---

# {% $markdoc.frontmatter.title %} {% #overview %}

Markdoc is a Markdown-based syntax and toolchain for creating custom documentation sites. Stripe created Markdoc to power [our public docs](http://stripe.com/docs).

{% callout type="check" %}
Markdoc is open-source—check out its [source](http://github.com/markdoc/markdoc) to see how it works.
{% /callout %}

## How is Markdoc different?

Markdoc uses a fully declarative approach to composition and flow control, where other solutions… [Read more](/docs/overview).

## Next steps
- [Install Markdoc](/docs/getting-started)
- [Explore the syntax](/docs/syntax)
`;

const BASE_FRONTMATTER = { markdoc: { title: '' } };

export function useMarkdocCode(code) {
  const ast = React.useMemo(() => {
    try {
      return Markdoc.parse(code);
    } catch (error) {
      console.log(error);
      return Markdoc.parse(
        `{% callout type="error" %}${error.message}{% /callout %}`
      );
    }
  }, [code]);

  const config = React.useMemo(() => {
    const { components, ...rest } = getSchema(schema);
    // require here to prevent Webpack Promise issue
    const yaml = require('js-yaml');

    let frontmatter = BASE_FRONTMATTER;
    try {
      if (ast.attributes.frontmatter) {
        frontmatter = yaml.load(ast.attributes.frontmatter);
      }
    } catch (error) {
      // pass
    }

    return {
      ...rest,
      variables: {
        markdoc: {
          frontmatter: frontmatter || BASE_FRONTMATTER
        },
        invalid_code: `\n{% callout %}\nHere!\n`
      },
      components
    };
  }, [ast]);

  const content = React.useMemo(
    () => Markdoc.transform(ast, config),
    [ast, config]
  );

  const errors = React.useMemo(
    () => Markdoc.validate(ast, config),
    [ast, config]
  );

  return { ast, content, config, errors };
}

// NOTE: In development mode, you may see two CodeMirror editors rendered, one
// on top of another. I don't know why this happens, but it does not occur in
// production builds. You can verify this by running `npm run build && npm run
// start`.
function EditorInternal({ code, onChange, options, errors, cursor }) {
  const ref = React.useRef();
  const [key, setKey] = React.useState(0);
  const [CodeMirror, setCodeMirror] = React.useState(null);

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
      const editor = ref.current?.editor;

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

  React.useEffect(() => {
    const { Controlled } = require('react-codemirror2');
    require('codemirror/mode/markdown/markdown');
    require('codemirror/mode/javascript/javascript');
    require('codemirror/mode/xml/xml');
    require('codemirror/addon/selection/mark-selection');
    require('./codemirror/markdoc.js');
    setCodeMirror(() => Controlled);
    setKey((k) => k + 1);
  }, []);

  if (!CodeMirror) {
    return null;
  }

  return (
    <>
      <CodeMirror
        ref={ref}
        key={key}
        value={code}
        options={codeMirrorOptions}
        onBeforeChange={onBeforeChange}
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

export function Editor(props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Codemirror doesn't work w/ SSR
  return mounted ? <EditorInternal {...props} /> : null;
}

const DELAY = 50;
function Cursor({ children }) {
  const ref = React.useRef();
  const [pos, setPos] = React.useState({});

  React.useEffect(() => {
    function handler(event) {
      const el = ref.current;
      if (el) {
        setPos({
          top: event.clientY - 13,
          left: event.clientX + 16
        });
      }
    }

    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  const letters = React.useMemo(
    () =>
      children.split('').map((l, i) => (
        <span
          key={`${l}_${i}`}
          style={{
            transform:
              pos.top && pos.left
                ? `translate(${pos.left + i * 8}px, ${pos.top}px)`
                : '',
            transition: `transform ${DELAY}ms linear ${i * 1}ms`
          }}
        >
          {l}
        </span>
      )),
    [children, pos]
  );

  return (
    <div id="hover" ref={ref}>
      {letters}
      <style jsx>
        {`
          #hover {
            top: 0;
            left: 0;
            display: none;
            position: fixed;
            color: var(--white);
            mix-blend-mode: difference;
            font-family: var(--mono);
            font-size: 13px;
            font-weight: 500;
            line-height: 27px;
            letter-spacing: -0.03em;
            z-index: 999;
          }

          #hover :global(span) {
            position: fixed;
            will-change: transform;
          }

          :global(.preview:hover #hover span) {
            padding-top: 7px;
          }

          /* Show 'Try' text on hover on the landing page */
          :global(.page--landing .sandbox .container:hover) #hover {
            display: block;
          }
        `}
      </style>
    </div>
  );
}

function encode(s) {
  try {
    return encodeURIComponent(Buffer.from(s).toString('base64'));
  } catch (e) {
    return null;
  }
}

function decode(s) {
  try {
    return Buffer.from(decodeURIComponent(s), 'base64').toString();
  } catch (error) {
    return null;
  }
}

const initialCursor = { line: 0, ch: 3 };
export function Sandbox({ height, options }) {
  const [key, setKey] = React.useState(0);
  const router = useRouter();
  const [code, setCode] = React.useState(INITIAL_CODE);
  const [mode, setMode] = React.useState('preview');
  const [hasInteracted, setInteracted] = React.useState(false);

  const isInSandbox =
    typeof window !== 'undefined' && window.location.pathname === '/sandbox';

  const { ast, content, config, errors } = useMarkdocCode(code);

  const format = React.useCallback(() => setCode(Markdoc.format(ast)), [ast]);

  React.useEffect(() => {
    function handler(e) {
      if (e.key === ';' && e.metaKey) {
        format();
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [format]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('c');
    if (mode) {
      setMode(mode);
    }
    if (code) {
      const decoded = decode(code);
      if (decoded) setCode(decoded);
    }
  }, []);

  React.useEffect(() => {
    if (mode && isInSandbox) {
      const query = new URLSearchParams(window.location.search);
      query.set('mode', mode);
      history.replaceState(null, '', '?' + query.toString());
    }
  }, [mode, isInSandbox]);

  React.useEffect(() => {
    const encoded = encode(code);
    if (
      code &&
      code !== INITIAL_CODE &&
      window.location.pathname === '/sandbox' &&
      encoded
    ) {
      const query = new URLSearchParams(window.location.search);
      query.set('c', encoded);
      history.replaceState(null, '', '?' + query.toString());
    }
  }, [code]);

  React.useEffect(() => setKey((k) => k + 1), []);

  return (
    <div className="sandbox" onClick={() => setInteracted(true)}>
      <nav>
        <div className="btn-group">
          <button onClick={() => setCode(INITIAL_CODE)}>Reset</button>
          {isInSandbox && (
            <button title="CMD + ;" onClick={format}>
              Format
            </button>
          )}
        </div>
        <div className="btn-group">
          {router.pathname === '/' ? (
            <button onClick={() => router.push('/sandbox')}>
              Explore developer sandbox&nbsp;→
            </button>
          ) : (
            <>
              <button
                className={mode === 'preview' ? 'active' : undefined}
                onClick={() => setMode('preview')}
              >
                React
              </button>
              <button
                className={mode === 'transform' ? 'active' : undefined}
                onClick={() => setMode('transform')}
              >
                Renderable tree
              </button>
              <button
                className={mode === 'ast' ? 'active' : undefined}
                onClick={() => setMode('ast')}
              >
                AST
              </button>
            </>
          )}
        </div>
      </nav>
      <div className="flex container">
        <section className="left">
          <Editor
            key={key}
            code={code}
            onChange={(...args) => {
              setInteracted(true);
              setCode(...args);
            }}
            options={options}
            errors={errors}
            cursor={initialCursor}
          />
        </section>
        <section className="right dark">
          {mode === 'preview' && (
            <div className="preview light">
              {hasInteracted ? null : <Cursor>Try it out</Cursor>}
              {Markdoc.renderers.react(content, React, {
                components: config.components
              })}
            </div>
          )}
          {mode === 'transform' && (
            <ObjectDisplay data={JSON.parse(JSON.stringify(content))} />
          )}
          {mode === 'ast' && (
            <ObjectDisplay data={JSON.parse(JSON.stringify(ast))} />
          )}
        </section>
      </div>
      <style jsx>
        {`
          .sandbox {
            width: 100%;
            height: ${height};
            display: flex;
            flex-direction: column;
            flex-flow: column;
            flex-grow: 1;
            border: 1px solid var(--black);
          }

          nav {
            display: flex;
            justify-content: space-between;
            flex: 0 1 auto;
            padding: 0.5rem;
            background: var(--contrast-dark);
          }

          button {
            cursor: pointer;
            color: var(--white);
            background: var(--black-medium);
            border: 1px solid var(--black-light);
            padding: 0.25rem 0.5rem;
            font-size: 13px;
            transition: color 300ms ease;
          }

          button.active,
          button:hover {
            color: var(--theme);
          }

          :global(.dark) button {
            background: var(--black);
          }

          .btn-group:after {
            content: '';
            clear: both;
            display: table;
          }

          .btn-group button:not(:last-child) {
            border-right: none;
          }

          .container {
            display: flex;
            flex: 1;
            min-height: 0;
          }

          section {
            position: relative;
            overflow: auto;
            width: 50%;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .preview {
            color: var(--black);
            height: 100%;
            padding: 1.5rem;
          }

          .left :global(.CodeMirror) {
            border-top: 1px solid rgba(255, 255, 255, 0.22);
          }

          .left :global(.CodeMirror),
          .left :global(.react-codemirror2) {
            color: white;
            background: var(--contrast-dark);
          }

          .left :global(.CodeMirror-lines) {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
          }
          .left :global(.CodeMirror-line) {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }

          .right {
            ${mode === 'preview'
              ? 'background: var(--white);'
              : `background: var(--black-medium);
                 color: white;
                 border-left: 1px solid rgba(255, 255, 255, 0.22);
                 border-top: 1px solid rgba(255, 255, 255, 0.22);`}
          }

          .sandbox .preview :global(h1) {
            --font-size-jumbo: 29px;
            --line-height-jumbo: 52px;
            font-size: 29px;
            line-height: 52px;
            margin-top: 0rem;
          }

          .sandbox .preview :global(h2) {
            font-size: 18px;
            line-height: 26px;
            margin-top: 1rem;
          }

          .sandbox .preview :global(p) {
            font-size: var(--font-size-3);
            line-height: var(--line-height-3);
            font-weight: 400;
          }

          .sandbox .preview :global(.callout p) {
            font-size: 14px;
            line-height: 20px;
          }

          .sandbox .preview :global(.cursor) {
            width: 4px;
          }
        `}
      </style>
    </div>
  );
}
