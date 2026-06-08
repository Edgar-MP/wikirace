import type { APIRoute } from 'astro';
import { createSession } from '@/lib/auth/session';
import { registerSchema, registerUser } from '@/lib/auth/users';
import { handleApiError, json } from '@/lib/http';

async function readInput(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json();
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const input = registerSchema.parse(await readInput(request));
    const user = await registerUser(input);
    await createSession(user.id, cookies);

    if (request.headers.get('accept')?.includes('application/json')) {
      return json({ user }, { status: 201 });
    }

    return redirect('/profile', 303);
  } catch (error) {
    return handleApiError(error);
  }
};
