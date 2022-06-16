import { parse, transform } from '.';

const crash = `# this is a heading

\`\`\`
hello {%
\`\`\``;

const ast = parse(crash);

// console.log(ast);
