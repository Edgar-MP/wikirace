import type { APIContext } from 'astro';
import { ZodError } from 'zod';

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = 'You must be logged in.') {
  return json({ error: message }, { status: 401 });
}

export function notFound(message = 'Not found.') {
  return json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return json({ error: message }, { status: 409 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  return json({ error: message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest('Invalid request body.', error.flatten());
  }

  if (error instanceof Response) {
    return error;
  }

  return serverError(error);
}

export function redirect(context: APIContext, path: string) {
  return context.redirect(path, 303);
}
