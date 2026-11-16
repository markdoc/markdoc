import React from 'react';

export function Features({ children }) {
  return (
    <div className="features">
      {children}
      <style jsx>
        {`
          .features :global(ul) {
            display: flex;
            gap: 4rem;
            padding: 0;
          }

          .features :global(li) {
            list-style: none;
            margin: 0;
            flex: 1 0 0;
          }

          .features :global(p) {
            font-size: var(--font-size-3);
            line-height: var(--line-height-3);
            letter-spacing: 0em;
          }

          .features :global(li strong) {
            font-family: var(--sans);
            font-size: 18px;
            font-weight: 590;
            line-height: 27px;
            letter-spacing: 0em;
          }

          .features :global(li .primary) {
            font-size: 15px;
            line-height: 27px;
            padding-top: 1rem;
          }

          @media screen and (max-width: 1000px) {
            .features :global(ul) {
              gap: 24px;
            }
          }

          @media screen and (max-width: 600px) {
            .features :global(ul) {
              flex-direction: column;
              gap: 45px;
            }
            .features :global(li .primary) {
              padding-top: 0rem;
            }
          }
        `}
      </style>
    </div>
  );
}
