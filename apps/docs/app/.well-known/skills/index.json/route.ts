import { getSkills } from '../../../../lib/skills';

export const dynamic = 'force-static';

export async function GET() {
  return Response.json({ skills: await getSkills() });
}
