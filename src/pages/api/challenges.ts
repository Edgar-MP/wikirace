import type { APIRoute } from 'astro';
import { createChallenge, createChallengeSchema } from '@/lib/game/service';
import { getCurrentUser } from '@/lib/auth/session';
import { handleApiError, json, readJson } from '@/lib/http';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const currentUser = await getCurrentUser(cookies).catch(() => null);
    const body = createChallengeSchema.parse(await readJson(request));
    const challenge = await createChallenge(body, currentUser?.id);

    return json({ challenge }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};
