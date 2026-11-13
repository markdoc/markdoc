import React from 'react';

const BODY_TRANSITION = `color 400ms ease, background 300ms ease`;

const sun = (
  <svg
    className="sun"
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8.79932" cy="8" r="4" fill="currentColor" />
    <circle className="ray" cx="8.79932" cy="1" r="1" fill="currentColor" />
    <circle className="ray" cx="8.79932" cy="15" r="1" fill="currentColor" />
    <circle
      className="ray"
      cx="1.79932"
      cy="8"
      r="1"
      transform="rotate(-90 1.79932 8)"
      fill="currentColor"
    />
    <circle
      className="ray"
      cx="15.7993"
      cy="8"
      r="1"
      transform="rotate(-90 15.7993 8)"
      fill="currentColor"
    />
    <circle
      className="ray"
      cx="3.84927"
      cy="3.05078"
      r="1"
      transform="rotate(-45 3.84927 3.05078)"
      fill="currentColor"
    />
    <circle
      className="ray"
      cx="13.7487"
      cy="12.9503"
      r="1"
      transform="rotate(-45 13.7487 12.9503)"
      fill="currentColor"
    />
    <circle
      className="ray"
      cx="3.84961"
      cy="12.9491"
      r="1"
      transform="rotate(-135 3.84961 12.9491)"
      fill="currentColor"
    />
    <circle
      className="ray"
      cx="13.749"
      cy="3.04957"
      r="1"
      transform="rotate(-135 13.749 3.04957)"
      fill="currentColor"
    />
  </svg>
);

const moon = (
  <svg
    className="moon"
    width="12"
    height="13"
    viewBox="0 0 12 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.3764 9.04656C11.2112 9.06022 11.0441 9.06718 10.8754 9.06718C7.56173 9.06718 4.87549 6.38093 4.87549 3.06728C4.87549 1.94653 5.18278 0.897541 5.71771 -1.22983e-05C2.52866 0.186293 0 2.83147 0 6.06725C0 9.42391 2.7211 12.145 6.07776 12.145C8.35189 12.145 10.3343 10.896 11.3764 9.04656Z"
      fill="currentColor"
    />
  </svg>
);

export function ThemeToggle() {
  const [theme, setTheme] = React.useState(undefined);
  const [, setHovering] = React.useState(false);

  function setPreferredTheme(newTheme) {
    setTheme(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (err) {
      //
    }
  }

  React.useEffect(() => {
    let preferredTheme;
    try {
      preferredTheme = localStorage.getItem('theme');
    } catch (err) {
      //
    }

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addListener((e) => setTheme(e.matches ? 'dark' : 'light'));

    setTheme(preferredTheme || (darkQuery.matches ? 'dark' : 'light'));
  }, []);

  React.useEffect(() => {
    if (theme) {
      document.body.className = theme;
    }
  }, [theme]);

  const isDark = theme === 'dark'; // ? !hovering : hovering;

  return (
    <div
      className="theme-toggle"
      onMouseEnter={() => setHovering(true)}
      onFocus={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onBlur={() => setHovering(false)}
    >
      <button
        className={isDark ? 'dark' : 'light'}
        onClick={() => {
          // Don't transition body styles on initial load, when toggled
          document.body.style.transition = BODY_TRANSITION;
          setPreferredTheme(theme === 'dark' ? 'light' : 'dark');
        }}
      >
        {isDark ? moon : sun}
        <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
      </button>
      <style jsx>
        {`
          button {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
            width: 120px;
            font-size: 15px;
            line-height: 27px;
            font-weight: 400;
            border-radius: 3px;
            white-space: nowrap;
          }

          .dark {
            background: var(--contrast-dark);
            color: var(--white);
          }

          .light {
            background: var(--gray-light);
            color: var(--black);
          }

          button:active :global(svg) {
            animation: rotate 150ms linear forwards;
          }

          button :global(.sun) {
            animation: sun 400ms ease both;
          }

          button :global(.moon) {
            animation: moon 400ms ease both;
          }

          button :global(circle.ray) {
            transform-origin: center;
            animation: rays 400ms ease both;
          }

          @keyframes rotate {
            from {
              transform: initial;
            }
            to {
              transform: scale(0.95) rotate(20deg);
            }
          }

          @keyframes sun {
            from {
              transform: scale(1.5);
            }
            to {
              transform: scale(1);
            }
          }

          @keyframes rays {
            from {
              transform: rotate(45deg);
            }
            to {
              transform: rotate(0deg);
            }
          }

          @keyframes moon {
            from {
              transform: scale(0.6) rotate(90deg);
            }
            to {
              transform: scale(1) rotate(0deg);
            }
          }

          @media screen and (max-width: 600px) {
            button {
              width: 130px;
            }
          }
        `}
      </style>
    </div>
  );
}
