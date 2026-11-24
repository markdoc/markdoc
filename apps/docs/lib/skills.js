import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const skillsRoot = path.resolve(process.cwd(), '../../plugins/markdoc/skills');

export async function getSkills() {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const directory = path.join(skillsRoot, name);
      const source = await readFile(path.join(directory, 'SKILL.md'), 'utf8');
      const frontmatter = source.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
      );
      const metadata = frontmatter && yaml.load(frontmatter[1]);
      if (metadata?.name !== name || typeof metadata.description !== 'string') {
        throw new Error(`Invalid skill metadata: ${name}`);
      }

      const files = await readdir(directory, {
        recursive: true,
        withFileTypes: true,
      });
      return {
        name,
        description: metadata.description,
        files: files
          .filter((file) => file.isFile())
          .map((file) =>
            path
              .relative(directory, path.join(file.parentPath, file.name))
              .split(path.sep)
              .join('/'),
          )
          .sort(),
      };
    }),
  );
}

export async function readSkillFile(segments) {
  const [name, ...parts] = segments;
  const file = parts.join('/');
  const skill = (await getSkills()).find((skill) => skill.name === name);
  if (!skill?.files.includes(file)) return null;

  return readFile(path.join(skillsRoot, name, file));
}
