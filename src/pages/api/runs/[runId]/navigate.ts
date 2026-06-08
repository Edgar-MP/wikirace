import type { APIRoute } from 'astro';
import { navigateRun, navigateRunSchema } from '@/lib/game/service';
import { handleApiError, json, readJson } from '@/lib/http';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const runId = params.runId;
    if (!runId) {
      throw new Error('Run id is required.');
    }

    const body = navigateRunSchema.parse(await readJson(request));
    const result = await navigateRun(runId, body.toTitle);

    return json(result);
  } catch (error) {
    return handleApiError(error);
  }
};
