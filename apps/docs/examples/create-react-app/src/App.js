import React from 'react';
import Markdoc from '@markdoc/markdoc';
import { Callout } from './Callout';

function App() {
  const [content, setContent] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const response = await fetch(
        `/markdoc-api?` +
          new URLSearchParams({
            path: window.location.pathname
          }),
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (response.status === 404) {
        setContent('404');
        return;
      }

      const content = await response.json();
      setContent(content);
    })();
  }, []);

  if (content === '404') {
    return <p>Page not found.</p>;
  }

  if (!content) {
    return <p>Loading...</p>;
  }

  const components = {
    Callout
  };

  return Markdoc.renderers.react(content, React, {
    components
  });
}

export default App;
