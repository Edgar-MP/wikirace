import type { APIRoute } from 'astro';
import { abandonRun } from '@/lib/game/service';
import { handleApiError, json } from '@/lib/http';

export const POST: APIRoute = async ({ params }) => {
  try {
    const runId = params.runId;
    if (!runId) {
      throw new Error('Run id is required.');
    }

    const run = await abandonRun(runId);
    return json({ run });
  } catch (error) {
    return handleApiError(error);
  }
};
