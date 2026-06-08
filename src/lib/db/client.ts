import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL;
}

export function getDb() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!client) {
    client = postgres(databaseUrl, {
      max: 10,
      prepare: false,
    });
    db = drizzle(client, { schema });
  }

  return db!;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = undefined;
    db = undefined;
  }
}
