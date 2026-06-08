import { canNavigateTo } from '@/lib/wiki/html';
import { sameTitle } from '@/lib/wiki/title';

export type LeaderboardCandidate = {
  clicks: number;
  durationSeconds: number | null;
  completedAt: Date | null;
};

export function isValidNavigation(currentLinks: string[], toTitle: string) {
  return canNavigateTo(currentLinks, toTitle);
}

export function isChallengeTarget(currentTitle: string, targetTitle: string) {
  return sameTitle(currentTitle, targetTitle);
}

export function compareLeaderboard(a: LeaderboardCandidate, b: LeaderboardCandidate) {
  if (a.clicks !== b.clicks) {
    return a.clicks - b.clicks;
  }

  const aDuration = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  const bDuration = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
  if (aDuration !== bDuration) {
    return aDuration - bDuration;
  }

  return (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0);
}
