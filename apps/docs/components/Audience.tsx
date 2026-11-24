import type * as React from 'react';

// Content for people reading the site. The Markdown output omits it.
export function Humans({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

// Content for agents reading the Markdown output. The site omits it.
export function Agents() {
  return null;
}
