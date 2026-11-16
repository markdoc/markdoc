import React from 'react';

const TYPE_DURATION = 30;
const SWAP_DURATION = 400;
const SWAP_DELAY = 150;
const SWAP_FUNCTION = 'cubic-bezier(0.75, 0, 0.25, 1)';

function Swapper({ before, after, onEnd }) {
  const [running, setRunning] = React.useState(false);
  const ref = React.useRef(false);
  const state = running ? 'running' : 'paused';

  return (
    <span className="swapper">
      <div
        className="before"
        onAnimationEnd={() => {
          // Call onAnimationEnd once per lifecycle
          if (!ref.current && onEnd) {
            onEnd(true);
            ref.current = true;
          }
        }}
      >
        <Type text={before} onEnd={() => setRunning(true)} />
      </div>
      {running && <div className="after">{after}</div>}
      <style jsx>
        {`
          .swapper {
            display: inline-flex;
            flex-direction: column;
            height: var(--line-height-jumbo);
            overflow-y: hidden;
          }
          .before {
            color: var(--translucent);
            animation: swap ${SWAP_DURATION}ms ${SWAP_FUNCTION} ${SWAP_DELAY}ms
                both ${state},
              fade ${SWAP_DURATION}ms ${SWAP_FUNCTION} ${SWAP_DELAY}ms reverse
                both ${state};
            user-select: none;
          }
          .after {
            animation: swap ${SWAP_DURATION}ms ${SWAP_FUNCTION} ${SWAP_DELAY}ms
                both running,
              fade ${SWAP_DURATION}ms ${SWAP_FUNCTION} ${SWAP_DELAY}ms normal
                both running;
          }
          @keyframes swap {
            from {
              transform: translateY(0);
            }
            to {
              transform: translateY(-100%);
            }
          }
          @keyframes fade {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>
    </span>
  );
}

function Type({ text, onEnd }) {
  const [state, setState] = React.useState(0);

  React.useEffect(() => {
    if (state < text.length) {
      const timeout = setTimeout(() => setState((s) => s + 1), TYPE_DURATION);
      return () => clearTimeout(timeout);
    } else {
      onEnd();
    }
  }, [text, state, onEnd]);

  return text.substring(0, state);
}

const text =
  'Markdoc is a powerful, flexible, Markdown-based authoring framework.';

export function Typewriter() {
  const [state, setState] = React.useState(0);
  const [done, setDone] = React.useState(false);

  const next = React.useCallback(() => setState((s) => s + 1), []);

  return (
    <h1 className="jumbo" aria-label={text}>
      <span className="prefers-no-animation">{text}</span>
      <span aria-hidden="true" className="prefers-animation">
        <Swapper before="# Markdoc" after="Markdoc is" onEnd={next} />
        {state >= 1 && <Type text=" a " onEnd={next} />}
        {state >= 2 && (
          <Swapper before="{% type %}" after="powerful," onEnd={next} />
        )}
        {state >= 3 && (
          <>
            <br />
            <Type text=" flexible, Markdown-based " onEnd={next} />
          </>
        )}
        {state >= 4 && (
          <>
            <br />
            <Swapper
              before="{% toolchain %}"
              after="authoring framework."
              onEnd={setDone}
            />
          </>
        )}
        <span className="cursor-container">
          <div className="cursor" />
        </span>
      </span>
      <style jsx>
        {`
          h1 {
            // Prevent page jump
            height: calc(var(--line-height-jumbo) * 3);
            overflow: hidden;
          }
          .cursor-container {
            position: relative;
            display: inline-block;
          }
          .cursor {
            position: absolute;
            display: inline-block;
            top: -0.82em;
            left: 12px;
            width: 8px;
            height: 0.96em;
            background: var(--theme);
            ${done ? 'display: none;' : ''}
          }
          @media screen and (max-width: 660px) {
            h1 {
              height: unset;
              overflow: initial;
            }
          }
        `}
      </style>
    </h1>
  );
}
