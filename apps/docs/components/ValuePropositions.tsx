'use client';

import * as React from 'react';

import { Ascii, TYPE_MAP } from './Ascii';

export function ValuePropositions({ children }: { children?: React.ReactNode }) {
  return (
    <div className="value-propositions">
      {children}
      <style jsx>
        {`
          .value-propositions {
            display: flex;
            gap: 56px;
          }

          @media screen and (max-width: 1000px) {
            .value-propositions {
              flex-direction: column;
              gap: 52px;
            }
          }

          @media screen and (max-width: 600px) {
            .value-propositions {
              gap: 30px;
            }
          }
        `}
      </style>
    </div>
  );
}

export function ValueProposition({
  icon,
  children
}: {
  icon: keyof typeof TYPE_MAP;
  children?: React.ReactNode;
}) {
  return (
    <div className="value-proposition">
      <Ascii primary={icon} />
      <div>{children}</div>
      <style jsx>
        {`
          .value-proposition {
            display: flex;
            flex-direction: column;
            flex: 1 0 0;
            gap: 4px;
          }

          .value-proposition :global(h3) {
            font-size: 28px;
            line-height: 38px;
            margin: 0;
            letter-spacing: 0;
          }

          @media screen and (max-width: 1000px) {
            .value-proposition {
              flex-direction: row;
              align-items: flex-start;
              gap: 36px;
            }

            .value-proposition :global(h3) {
              font-size: 24px;
              line-height: 33px;
            }
          }

          @media screen and (max-width: 600px) {
            .value-proposition {
              display: block;
            }
          }
        `}
      </style>
    </div>
  );
}
