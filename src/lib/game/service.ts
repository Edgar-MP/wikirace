import { and, asc, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { requireSupportedLang, type WikiLang } from '@/lib/config';
import { getDb } from '@/lib/db/client';
import { challenges, runs, runSteps, users } from '@/lib/db/schema';
import { getCachedWikipediaPage } from '@/lib/wiki/client';
import { normalizeTitle, sameTitle, titleKey } from '@/lib/wiki/title';
import { isChallengeTarget, isValidNavigation } from './rules';

export const createChallengeSchema = z.object({
  lang: z.string().transform(requireSupportedLang),
  startTitle: z.string().trim().min(1).max(240).transform(normalizeTitle),
  targetTitle: z.string().trim().min(1).max(240).transform(normalizeTitle),
});

export const createRunSchema = z.object({
  challengeId: z.string().min(1),
  guestAlias: z.string().trim().min(2).max(40).optional(),
});

export const navigateRunSchema = z.object({
  toTitle: z.string().trim().min(1).max(240).transform(normalizeTitle),
});

export type LeaderboardRow = {
  runId: string;
  playerName: string;
  lang: string;
  startTitle: string;
  targetTitle: string;
  clicks: number;
  durationSeconds: number;
  completedAt: Date;
};

export async function createChallenge(input: z.infer<typeof createChallengeSchema>, userId?: string) {
  if (sameTitle(input.startTitle, input.targetTitle)) {
    throw new Error('Origin and target cannot be the same article.');
  }

  const db = getDb();
  const [challenge] = await db
    .insert(challenges)
    .values({
      id: nanoid(18),
      lang: input.lang,
      startTitle: input.startTitle,
      targetTitle: input.targetTitle,
      createdByUserId: userId,
    })
    .returning();

  return challenge;
}

export async function createRun(
  input: z.infer<typeof createRunSchema>,
  identity: { userId?: string; guestAlias?: string },
) {
  const db = getDb();
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);

  if (!challenge) {
    throw new Error('Challenge not found.');
  }

  const guestAlias = identity.userId ? null : normalizeTitle(input.guestAlias ?? identity.guestAlias ?? '');
  if (!identity.userId && !guestAlias) {
    throw new Error('Guest alias is required.');
  }

  const [run] = await db
    .insert(runs)
    .values({
      id: nanoid(18),
      challengeId: challenge.id,
      userId: identity.userId,
      guestAlias,
      currentTitle: challenge.startTitle,
    })
    .returning();

  return { run, challenge };
}

export async function getRunState(runId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      run: runs,
      challenge: challenges,
      user: {
        id: users.id,
        displayName: users.displayName,
      },
    })
    .from(runs)
    .innerJoin(challenges, eq(runs.challengeId, challenges.id))
    .leftJoin(users, eq(runs.userId, users.id))
    .where(eq(runs.id, runId))
    .limit(1);

  return row ?? null;
}

export async function getRunSteps(runId: string) {
  return getDb()
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(runSteps.stepNumber));
}

export async function getArticleForRun(runId: string, requestedTitle?: string) {
  const state = await getRunState(runId);
  if (!state) {
    throw new Error('Run not found.');
  }

  if (state.run.status !== 'active') {
    throw new Error('This run is not active.');
  }

  if (requestedTitle && !sameTitle(requestedTitle, state.run.currentTitle)) {
    throw new Error('Requested article is not the current article for this run.');
  }

  const page = await getCachedWikipediaPage(state.challenge.lang as WikiLang, state.run.currentTitle);

  return {
    ...page,
    isTarget: isChallengeTarget(page.title, state.challenge.targetTitle),
    targetTitle: state.challenge.targetTitle,
    clicks: state.run.clicks,
  };
}

export async function navigateRun(runId: string, toTitle: string) {
  const db = getDb();
  const state = await getRunState(runId);
  if (!state) {
    throw new Error('Run not found.');
  }

  if (state.run.status !== 'active') {
    throw new Error('This run is not active.');
  }

  const currentPage = await getCachedWikipediaPage(
    state.challenge.lang as WikiLang,
    state.run.currentTitle,
  );

  if (!isValidNavigation(currentPage.links, toTitle)) {
    throw new Error('The requested article is not linked from the current article.');
  }

  const canonicalDestination =
    currentPage.links.find((link) => titleKey(link) === titleKey(toTitle)) ?? normalizeTitle(toTitle);
  const nextClicks = state.run.clicks + 1;
  const completed = sameTitle(canonicalDestination, state.challenge.targetTitle);
  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - state.run.startedAt.getTime()) / 1000),
  );

  await db.insert(runSteps).values({
    id: nanoid(18),
    runId,
    stepNumber: nextClicks,
    fromTitle: state.run.currentTitle,
    toTitle: canonicalDestination,
  });

  const [updatedRun] = await db
    .update(runs)
    .set({
      currentTitle: canonicalDestination,
      clicks: nextClicks,
      status: completed ? 'completed' : 'active',
      durationSeconds: completed ? durationSeconds : null,
      completedAt: completed ? now : null,
    })
    .where(eq(runs.id, runId))
    .returning();

  return {
    run: updatedRun,
    completed,
    durationSeconds: completed ? durationSeconds : null,
    currentTitle: canonicalDestination,
  };
}

export async function abandonRun(runId: string) {
  const [run] = await getDb()
    .update(runs)
    .set({
      status: 'abandoned',
      abandonedAt: new Date(),
    })
    .where(and(eq(runs.id, runId), eq(runs.status, 'active')))
    .returning();

  return run ?? null;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const rows = await getDb()
    .select({
      runId: runs.id,
      userName: users.displayName,
      guestAlias: runs.guestAlias,
      lang: challenges.lang,
      startTitle: challenges.startTitle,
      targetTitle: challenges.targetTitle,
      clicks: runs.clicks,
      durationSeconds: runs.durationSeconds,
      completedAt: runs.completedAt,
    })
    .from(runs)
    .innerJoin(challenges, eq(runs.challengeId, challenges.id))
    .leftJoin(users, eq(runs.userId, users.id))
    .where(eq(runs.status, 'completed'))
    .orderBy(asc(runs.clicks), asc(runs.durationSeconds), desc(runs.completedAt))
    .limit(limit);

  return rows
    .filter((row) => row.durationSeconds !== null && row.completedAt !== null)
    .map((row) => ({
      runId: row.runId,
      playerName: row.userName ?? row.guestAlias ?? 'Invitado',
      lang: row.lang,
      startTitle: row.startTitle,
      targetTitle: row.targetTitle,
      clicks: row.clicks,
      durationSeconds: row.durationSeconds!,
      completedAt: row.completedAt!,
    }));
}

export async function getUserRuns(userId: string) {
  return getDb()
    .select({
      runId: runs.id,
      status: runs.status,
      lang: challenges.lang,
      startTitle: challenges.startTitle,
      targetTitle: challenges.targetTitle,
      clicks: runs.clicks,
      durationSeconds: runs.durationSeconds,
      startedAt: runs.startedAt,
      completedAt: runs.completedAt,
    })
    .from(runs)
    .innerJoin(challenges, eq(runs.challengeId, challenges.id))
    .where(eq(runs.userId, userId))
    .orderBy(desc(runs.startedAt))
    .limit(30);
}
