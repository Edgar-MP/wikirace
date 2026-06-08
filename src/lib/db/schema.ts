import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_unique').on(table.email),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 32 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('sessions_user_id_idx').on(table.userId),
    expiresIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  }),
);

export const challenges = pgTable(
  'challenges',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    lang: varchar('lang', { length: 8 }).notNull(),
    startTitle: text('start_title').notNull(),
    targetTitle: text('target_title').notNull(),
    createdByUserId: varchar('created_by_user_id', { length: 32 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    challengeLookupIdx: index('challenges_lang_titles_idx').on(
      table.lang,
      table.startTitle,
      table.targetTitle,
    ),
  }),
);

export const runs = pgTable(
  'runs',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    challengeId: varchar('challenge_id', { length: 32 })
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 32 }).references(() => users.id, { onDelete: 'set null' }),
    guestAlias: text('guest_alias'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    currentTitle: text('current_title').notNull(),
    clicks: integer('clicks').notNull().default(0),
    durationSeconds: integer('duration_seconds'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
  },
  (table) => ({
    challengeIdx: index('runs_challenge_id_idx').on(table.challengeId),
    userIdx: index('runs_user_id_idx').on(table.userId),
    leaderboardIdx: index('runs_leaderboard_idx').on(
      table.status,
      table.clicks,
      table.durationSeconds,
    ),
  }),
);

export const runSteps = pgTable(
  'run_steps',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    runId: varchar('run_id', { length: 32 })
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    fromTitle: text('from_title').notNull(),
    toTitle: text('to_title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runIdx: index('run_steps_run_id_idx').on(table.runId),
    uniqueRunStep: uniqueIndex('run_steps_run_step_unique').on(table.runId, table.stepNumber),
  }),
);

export const wikiPageCache = pgTable(
  'wiki_page_cache',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    lang: varchar('lang', { length: 8 }).notNull(),
    title: text('title').notNull(),
    canonicalTitle: text('canonical_title').notNull(),
    html: text('html').notNull(),
    links: jsonb('links').$type<string[]>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageUnique: uniqueIndex('wiki_page_cache_lang_title_unique').on(table.lang, table.title),
    expiresIdx: index('wiki_page_cache_expires_at_idx').on(table.expiresAt),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  runs: many(runs),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  runs: many(runs),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  challenge: one(challenges, {
    fields: [runs.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [runs.userId],
    references: [users.id],
  }),
  steps: many(runSteps),
}));

export type User = typeof users.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunStep = typeof runSteps.$inferSelect;
export type WikiPageCacheEntry = typeof wikiPageCache.$inferSelect;
