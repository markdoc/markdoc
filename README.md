<h1 align="center">
  <br>
    <img src="https://user-images.githubusercontent.com/62121649/167893184-a2b69260-ca9e-4a77-a5bc-63b8135ae5db.png" alt="Markdoc" width="300">
  <br>
  <br>
</h1>

<h4 align="center">A powerful, flexible, Markdown-based authoring framework.</h4>

Markdoc is a [Markdown](https://commonmark.org)-based syntax and toolchain for creating custom documentation sites and experiences.  
We designed Markdoc to power [Stripe's public docs](http://stripe.com/docs), our largest and most complex content site.

## Installation

To get started with Markdoc, first install the library:

```shell
npm install @markdoc/markdoc
```

or

```shell
yarn add @markdoc/markdoc
```

and import it in your app:

```js
const Markdoc = require('@markdoc/markdoc');
```

or if you are using ESM

```js
import Markdoc from '@markdoc/markdoc';
```

then use `Markdoc` in your app or tool:

```js
const doc = `
# Markdoc README

{% image src="/logo.svg" /%}
`;

const ast = Markdoc.parse(doc);
const content = Markdoc.transform(ast);
return Markdoc.renderers.react(content, React);
```

Check out [our docs](https://markdoc.io/docs) for more guidance on how to use Markdoc.

## Contributing

Contributions and feedback are welcome and encouraged. Check out our [contributing guidelines](.github/CONTRIBUTING.md) on how to do so.

### Development

1. Run `npm install`
1. Run `npm run build`
1. Run the tests using `npm test`

## Code of conduct

This project has adopted the Stripe [Code of conduct](.github/CODE_OF_CONDUCT.md).

## License

This project uses the [MIT license](LICENSE).

## Credits

Shout out to [@marcioAlmada](https://github.com/marcioAlmada) for providing us with the [@markdoc](https://github.com/markdoc) GitHub org.
