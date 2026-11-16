import withMarkdoc = require('@markdoc/next.js');
import loader = require('@markdoc/next.js/loader');

const options: withMarkdoc.MarkdocNextJsOptions = {
  nextjsExports: ['metadata'],
};
withMarkdoc(options)();
const load: typeof loader = loader;
void load;
