import { getSkills, readSkillFile } from '../../../../lib/skills';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSkills()).flatMap(({ name, files }) =>
    files.map((file) => ({ file: [name, ...file.split('/')] })),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string[] }> },
) {
  const { file } = await params;
  const content = await readSkillFile(file);
  if (content === null) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(content), {
    headers: {
      'Content-Type': file.at(-1)?.endsWith('.md')
        ? 'text/markdown; charset=utf-8'
        : 'text/plain; charset=utf-8',
    },
  });
}
