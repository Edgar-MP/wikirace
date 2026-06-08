import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/auth/session';
import { createRun, createRunSchema } from '@/lib/game/service';
import { handleApiError, json, readJson } from '@/lib/http';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const currentUser = await getCurrentUser(cookies).catch(() => null);
    const body = createRunSchema.parse(await readJson(request));
    const { run, challenge } = await createRun(body, {
      userId: currentUser?.id,
      guestAlias: body.guestAlias,
    });

    return json({ run, challenge, playUrl: `/play/${run.id}` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
