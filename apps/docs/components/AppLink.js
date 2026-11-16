import React from 'react';
import Link from 'next/link';

export function AppLink(props) {
  const target =
    props.target || (props.href.startsWith('http') ? '_blank' : undefined);

  return (
    <Link {...props} target={target} className={props.className}>
      {props.children}
    </Link>
  );
}
