'use client';

import { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { createStyleRegistry, StyleRegistry } from 'styled-jsx';

export default function StyledJsxRegistry({ children }) {
  const [registry] = useState(() => createStyleRegistry());
  useServerInsertedHTML(() => {
    const styles = registry.styles();
    registry.flush();
    return <>{styles}</>;
  });
  return <StyleRegistry registry={registry}>{children}</StyleRegistry>;
}
