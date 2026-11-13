import * as React from 'react';

export function YouTube(props) {
  return (
    <div>
      <iframe
        {...props}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <style jsx>
        {`
          iframe {
            aspect-ratio: 16 / 9;
            margin: var(--default-vertical-spacing) 0;
            border-radius: 4px;
            border: 1px solid var(--code-border);
          }
        `}
      </style>
    </div>
  );
}
