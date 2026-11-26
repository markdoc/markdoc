import { readdir } from 'node:fs/promises';
import path from 'node:path';

export async function getPageRoutes(directory = process.cwd()): Promise<string[]> {
  const files = await readdir(path.join(directory, 'app'), {
    recursive: true
  });
  return files
    .filter((file) => path.basename(file) === 'page.md')
    .map((file) =>
      `/${file.split(path.sep).join('/')}`.replace(/\/page\.md$/, '') || '/'
    );
}
