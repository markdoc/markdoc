import Head = require('next/head');
import Image = require('next/image');
import Link = require('next/link');
import Script = require('next/script');
import type { Config, Schema } from '@markdoc/markdoc';

export const comment: Schema = {
  description: 'Use to comment the content itself',
  attributes: {},
  transform() {
    return [];
  },
};

export const head: Schema<Config, typeof Head> = {
  render: Head,
  description: 'Renders a Next.js head tag',
  attributes: {},
};

export const image: Schema<Config, typeof Image> = {
  render: Image,
  description: 'Renders a Next.js image tag',
  // https://nextjs.org/docs/app/api-reference/components/image
  attributes: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    fill: {
      type: Boolean,
    },
    sizes: {
      type: String,
    },
    quality: {
      type: Number,
    },
    priority: {
      type: Boolean,
    },
    placeholder: {
      type: String,
      matches: ['blur', 'empty'],
    },
    loading: {
      type: String,
      matches: ['lazy', 'eager'],
    },
    blurDataURL: {
      type: String,
    },
  },
};

export const link: Schema<Config, typeof Link> = {
  render: Link,
  description: 'Displays a Next.js link',
  attributes: {
    href: {
      description: 'The path or URL to navigate to.',
      type: String,
      errorLevel: 'critical',
      required: true,
    },
    as: {
      description:
        'Optional decorator for the path that will be shown in the browser URL bar.',
      type: String,
    },
    passHref: {
      description: 'Forces Link to send the href property to its child.',
      type: Boolean,
      default: false,
    },
    prefetch: {
      description: 'Prefetch the page in the background.',
      type: Boolean,
    },
    replace: {
      description:
        'Replace the current history state instead of adding a new url into the stack.',
      type: Boolean,
      default: false,
    },
    scroll: {
      description: 'Scroll to the top of the page after a navigation.',
      type: Boolean,
      default: true,
    },
    shallow: {
      description:
        'Update the path of the current page without rerunning getStaticProps, getServerSideProps or getInitialProps.',
      type: Boolean,
      default: true,
    },
    locale: {
      description: 'The active locale is automatically prepended.',
      type: Boolean,
    },
    target: {
      description:
        'HTML attribute anchor target ("_self", "_blank", "_parent", "_top")',
      type: String,
    },
  },
};

export const script: Schema<Config, typeof Script> = {
  render: Script,
  description: 'Renders a Next.js script tag',
  attributes: {
    src: {
      type: String,
      errorLevel: 'critical',
      required: true,
    },
    strategy: {
      type: String,
      matches: ['beforeInteractive', 'afterInteractive', 'lazyOnload'],
    },
  },
};
