import type { ReactNode } from 'react';

const TYPE_MAP = {
  note: {
    color: '#8792a2'
  },
  caution: {
    color: '#d97917'
  },
  check: {
    color: '#000000'
  },
  warning: {
    color: '#ed5f74'
  }
};

type CalloutProps = {
  children?: ReactNode;
  type: keyof typeof TYPE_MAP;
  title?: string;
};

export function Callout({ children, type, title }: CalloutProps) {
  return (
    <div
      className="callout"
      style={{
        backgroundColor: TYPE_MAP[type].color
      }}
    >
      <h3>{title}</h3>
      {children}
    </div>
  );
}
