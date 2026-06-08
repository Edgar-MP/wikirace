import type { AstroCookies } from 'astro';
import { and, eq, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db/client';
import { sessions, users, type User } from '@/lib/db/schema';

export const SESSION_COOKIE = 'wikirace_session';
const SESSION_DAYS = 30;

export type CurrentUser = Pick<User, 'id' | 'email' | 'displayName'>;

export function sessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export async function createSession(userId: string, cookies: AstroCookies) {
  const db = getDb();
  const id = nanoid(48);
  const expiresAt = sessionExpiresAt();

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
  });

  cookies.set(SESSION_COOKIE, id, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    expires: expiresAt,
  });
}

export async function destroySession(cookies: AstroCookies) {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getCurrentUser(cookies: AstroCookies): Promise<CurrentUser | null> {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return row ?? null;
}
