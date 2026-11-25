import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import globPkg from 'glob';
const { sync } = globPkg;

import Markdoc, { type Node } from '@markdoc/markdoc';

type Frontmatter = Record<string, unknown> & { route: string };
type ContentManifest = Record<string, { ast: Node; frontmatter: Frontmatter }>;

const parseMarkdocFrontmatter = (ast: Node): Frontmatter => {
  return (
    ast.attributes.frontmatter ? load(ast.attributes.frontmatter) : {}
  ) as Frontmatter;
};

// This creates a mapping between route and parsed Markdoc content.
export function createContentManifest(ROOT_DIR: string): ContentManifest {
  const files = sync(`${ROOT_DIR}/**/*.md`);

  const contentManifest: ContentManifest = {};

  files.forEach((file) => {
    const rawText = readFileSync(file, 'utf-8');
    const ast = Markdoc.parse(rawText);
    const frontmatter = parseMarkdocFrontmatter(ast);

    contentManifest[frontmatter.route] = {
      ast,
      frontmatter
    };
  });

  return contentManifest;
}
