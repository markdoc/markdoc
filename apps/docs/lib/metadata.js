export const SITE_URL = 'https://markdoc.dev';
export const TITLE = 'Markdoc';
export const DESCRIPTION =
  'A powerful, flexible, Markdown-based authoring framework';

export function pageMetadata(frontmatter = {}, pathname = '/') {
  const title = frontmatter.title || TITLE;
  const description = frontmatter.description || DESCRIPTION;
  return {
    title: `${TITLE} | ${title}`,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      type: 'website',
      url: pathname,
      title,
      description,
      images: [`${SITE_URL}/images/share.png`]
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [`${SITE_URL}/images/share.png`]
    },
    other: { title }
  };
}
