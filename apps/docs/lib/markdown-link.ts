export function markdownHref(href: string, site: string): string {
  // Keep fragment and document-relative references unchanged.
  if (!href.startsWith('/') && !/^https?:\/\//i.test(href)) return href;

  let url: URL;
  try {
    url = new URL(href, site);
  } catch {
    return href;
  }
  if (url.origin !== site) return href;

  const route = url.pathname.replace(/\/$/, '');
  if (!route) {
    url.pathname = '/index.md';
  } else if (route === '/docs') {
    url.pathname = '/docs/getting-started.md';
  } else if (route === '/docs/nextjs') {
    url.pathname = '/docs/examples/nextjs.md';
  } else if (/^\/docs\/[^.]+$/.test(route)) {
    url.pathname = `${route}.md`;
  }

  return url.href;
}
