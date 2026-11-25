'use client';

import React from 'react';

type JsonContainer = Record<string, unknown> | unknown[];

const COLORS: Partial<Record<string, string>> = {
  string: 'var(--magenta)',
  number: 'var(--yellow)',
  boolean: 'var(--yellow)'
};

const VERTICAL_SPACING = 6;

const COMMA = <span style={{ color: 'var(--white)' }}>{','}</span>;

function Arrow({ onClick, style }: { onClick?: React.MouseEventHandler<HTMLElement>; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        position: 'absolute',
        border: '4px solid transparent',
        borderTop: '6px solid #bec5ca',
        top: '5px',
        left: '-12px',
        zIndex: 1,
        transformOrigin: 'center',
        ...style
      }}
      onClick={onClick}
    />
  );
}

function KeyValueRow({ children, onClick }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLElement> | null }) {
  return (
    <div
      style={{
        display: 'flex',
        flexFlow: 'row nowrap',
        alignItems: 'baseline',
        justifyContent: 'flex-start',
        margin: `${VERTICAL_SPACING}px 0`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative'
      }}
      onClick={onClick || undefined}
    >
      {!!onClick && (
        <>
          <Arrow
            onClick={onClick}
            style={{ transform: 'rotate(-90deg)', top: 3 }}
          />
        </>
      )}
      {children}
    </div>
  );
}

const getSurroundingChars = (isArray: boolean) => (isArray ? ['[', ']'] : ['{', '}']);

function LineStack({ data, rootKey, children, hasTrailingComma, onClick }: { data: JsonContainer; rootKey?: string; children: React.ReactNode; hasTrailingComma?: boolean; onClick: () => void }) {
  const isArray = Array.isArray(data);
  const [leading, trailing] = getSurroundingChars(isArray);

  return (
    <pre
      style={{
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        color: 'var(--white)',
        overflow: 'visible',
        margin: `${VERTICAL_SPACING}px 0`
      }}
    >
      <div
        onClick={onClick}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        <Arrow style={{ left: '-16px' }} />
        <span>
          {!!rootKey && (
            <>
              <span>&quot;{rootKey}&quot;</span>
              {': '}
            </>
          )}
          {leading}
        </span>
      </div>
      <div style={{ marginLeft: 16 }}>{children}</div>
      <span>{`${trailing}${hasTrailingComma ? ',' : ''}`}</span>
    </pre>
  );
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !Array.isArray(value) && typeof value === 'object' && value !== null;

export function ObjectDisplay({
  data,
  rootKey,
  hasTrailingComma,
  minCollapseSize = 1
}: { data: JsonContainer; rootKey?: string; hasTrailingComma?: boolean; minCollapseSize?: number }) {
  const childCount = Object.keys(data).length;
  const isEmpty = childCount === 0;

  const [isCollapsed, setCollapsed] = React.useState(
    () => hasTrailingComma && childCount > minCollapseSize
  );

  if ((isObject(data) || Array.isArray(data)) && (isCollapsed || isEmpty)) {
    const [leading, trailing] = getSurroundingChars(Array.isArray(data));

    return (
      <KeyValueRow
        onClick={isEmpty ? null : () => setCollapsed(false)}
      >
        {!!rootKey && (
          <>
            <span>&quot;{rootKey}&quot;</span>
            <pre>{': '}</pre>
          </>
        )}
        <pre>
          {isEmpty ? (
            `${leading}${trailing}`
          ) : (
            <>
              {leading}
              <span
                style={{ color: 'rgba(255, 255, 255, 0.4)', lineHeight: 0 }}
              >{` ... `}</span>
              <span
                style={{ lineHeight: 0, color: 'rgba(255, 255, 255, 0.4)' }}
              >{`${childCount} item${childCount === 1 ? '' : 's'} `}</span>
              {trailing}
            </>
          )}
        </pre>
        {hasTrailingComma && COMMA}
      </KeyValueRow>
    );
  }

  const lines = Object.entries(data).map(([key, value]) => {
    const valueColor = COLORS[typeof value];

    if (isObject(value) || Array.isArray(value)) {
      return (
        <ObjectDisplay
          key={key}
          data={value}
          rootKey={key}
          hasTrailingComma={true}
          minCollapseSize={minCollapseSize}
        />
      );
    }

    return (
      <KeyValueRow key={key}>
        {isObject(data) && (
          <>
            <pre>&quot;{key}&quot;</pre>
            <pre>{': '}</pre>
          </>
        )}
        <pre style={{ color: valueColor }}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
          {COMMA}
        </pre>
      </KeyValueRow>
    );
  });

  return (
    <div className="object-display">
      <LineStack
        data={data}
        rootKey={rootKey}
        hasTrailingComma={hasTrailingComma}
        onClick={() => setCollapsed(true)}
      >
        {lines}
      </LineStack>
      <style jsx>{`
        .object-display {
          height: 100%;
          padding-left: ${hasTrailingComma ? 0 : 8}px;
        }
        .object-display :global(pre) {
          border: none;
          border-radius: 0;
          font-family: var(--mono);
          font-size: 13px;
          word-wrap: break-word;
          white-space: pre-wrap;
          word-break: normal;
        }
      `}</style>
    </div>
  );
}
