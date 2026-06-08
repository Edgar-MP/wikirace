import { describe, expect, it } from 'vitest';
import { compareLeaderboard, isChallengeTarget, isValidNavigation } from './rules';

describe('game rules', () => {
  it('detects valid navigation from current links', () => {
    expect(isValidNavigation(['Historia', 'Matemáticas'], 'matemáticas')).toBe(true);
    expect(isValidNavigation(['Historia'], 'Física')).toBe(false);
  });

  it('detects reaching the target title', () => {
    expect(isChallengeTarget('Alan_Turing', 'Alan Turing')).toBe(true);
  });

  it('sorts leaderboard by clicks and then duration', () => {
    const rows = [
      { clicks: 4, durationSeconds: 50, completedAt: new Date('2026-01-02') },
      { clicks: 3, durationSeconds: 80, completedAt: new Date('2026-01-02') },
      { clicks: 3, durationSeconds: 40, completedAt: new Date('2026-01-02') },
    ];

    expect([...rows].sort(compareLeaderboard)).toEqual([rows[2], rows[1], rows[0]]);
  });
});
