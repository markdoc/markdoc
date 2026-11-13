const fs = require('fs');
const yaml = require('js-yaml');
const glob = require('glob');
const Markdoc = require('@markdoc/markdoc');

const parseMarkdocFrontmatter = (ast) => {
  return ast.attributes.frontmatter
    ? yaml.load(ast.attributes.frontmatter)
    : {};
};

// This creates a mapping between route and parsed Markdoc content.
exports.createContentManifest = (ROOT_DIR) => {
  const files = glob.sync(`${ROOT_DIR}/**/*.md`);

  const contentManifest = {};

  files.forEach((file) => {
    const rawText = fs.readFileSync(file, 'utf-8');
    const ast = Markdoc.parse(rawText);
    const frontmatter = parseMarkdocFrontmatter(ast);

    contentManifest[frontmatter.route] = {
      ast,
      frontmatter
    };
  });

  return contentManifest;
};
