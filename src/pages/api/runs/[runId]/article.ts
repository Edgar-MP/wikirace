import type { APIRoute } from 'astro';
import { getArticleForRun } from '@/lib/game/service';
import { handleApiError, json } from '@/lib/http';

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const runId = params.runId;
    if (!runId) {
      throw new Error('Run id is required.');
    }

    const article = await getArticleForRun(runId, url.searchParams.get('title') ?? undefined);
    return json(article);
  } catch (error) {
    return handleApiError(error);
  }
};
