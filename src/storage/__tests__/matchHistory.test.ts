import { describe, it, expect } from 'vitest';
import {
  addMatch,
  removeMatch,
  clearHistory,
  MatchRecord,
  MAX_HISTORY,
} from '../matchHistory';
import { SportKey, MatchConfig } from '../../engine';

function base(over: Partial<MatchRecord> = {}): Omit<MatchRecord, 'id' | 'createdAt'> {
  const config: MatchConfig = { sport: SportKey.FOOTBALL, mode: 'INSTANT', seed: 1 };
  return {
    sport: SportKey.FOOTBALL,
    scoreA: 2,
    scoreB: 1,
    winner: 'A',
    seed: 1,
    config,
    ...over,
  };
}

describe('matchHistory pure operations', () => {
  it('addMatch prepends and is capped at MAX_HISTORY', () => {
    let list: MatchRecord[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      list = addMatch(list, base());
    }
    expect(list).toHaveLength(MAX_HISTORY);
    // Newest first: createdAt is non-increasing down the list.
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].createdAt).toBeGreaterThanOrEqual(list[i].createdAt);
    }
    // Ids are unique (no clobbering).
    expect(new Set(list.map((r) => r.id)).size).toBe(list.length);
  });

  it('addMatch assigns a fresh id and createdAt when not supplied', () => {
    const next = addMatch([], base());
    expect(next[0].id).toBeTruthy();
    expect(next[0].createdAt).toBeGreaterThan(0);
  });

  it('removeMatch drops the matching id', () => {
    const a = addMatch([], base({ createdAt: 1 }));
    const b = addMatch(a, base({ createdAt: 2 }));
    const idA = a[0].id;
    const idB = b[0].id;
    expect(removeMatch(b, idA).map((r) => r.id)).toEqual([idB]);
  });

  it('clearHistory returns an empty list', () => {
    const a = addMatch([], base());
    expect(a.length).toBe(1);
    expect(clearHistory()).toEqual([]);
  });
});
