import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from './password';

export const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(40),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);

  if (existing.length > 0) {
    throw new Error('A user with this email already exists.');
  }

  const [user] = await db
    .insert(users)
    .values({
      id: nanoid(18),
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    });

  return user;
}

export async function authenticateUser(input: z.infer<typeof loginSchema>) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new Error('Invalid email or password.');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
