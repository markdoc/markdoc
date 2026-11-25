'use client';

import React from 'react';
import Markdoc from '@markdoc/markdoc';
import { Editor, useMarkdocCode } from './Sandbox';
import { EditPagePanel } from './EditPagePanel';
import { collectHeadings, PageBody } from './Shell/PageBody';

function EditPage({ source: initialDocument }: { source: string }) {
  const [doc, setDoc] = React.useState(initialDocument);
  const { content, config, errors } = useMarkdocCode(doc);

  return (
    <PageBody toc={collectHeadings(content)}>
      <article>
        {Markdoc.renderers.react((Markdoc.Tag.isTag(content) ? content.children : null), React, {
          components: config.components
        })}
      </article>
      <EditPagePanel>
        <Editor code={doc} onChange={setDoc} errors={errors} />
      </EditPagePanel>
    </PageBody>
  );
}

export function Document({ source, children }: { source?: string; children?: React.ReactNode }) {
  /**
   * Typically you would just render children here, but we are adding
   * this extra branch in order to pop up the editor that reveals
   * the source content for each document
   */
  return source ? (
    <EditPage key={source} source={source} />
  ) : (
    <article>{children}</article>
  );
}
