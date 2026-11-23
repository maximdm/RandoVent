import { describe, it, expect } from 'vitest';
import { getEngine, SportKey, defaultMatchConfig, computePlayerStats, computeMatchStats } from '../index';

describe('HandballEngine', () => {
  it('registry returns the engine and simulation is deterministic', () => {
    const engine = getEngine(SportKey.HANDBALL);
    const config = defaultMatchConfig(SportKey.HANDBALL, 2024);
    const a = engine.simulate(config);
    const b = engine.simulate(config);
    expect(a.scoreA).toBe(b.scoreA);
    expect(a.scoreB).toBe(b.scoreB);
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
  });

  it('ends with MATCH_END and a valid winner', () => {
    const r = getEngine(SportKey.HANDBALL).simulate(defaultMatchConfig(SportKey.HANDBALL, 5));
    expect(r.events[r.events.length - 1].kind).toBe('MATCH_END');
    expect(['A', 'B', 'DRAW']).toContain(r.winner);
    // Score matches the winner (no draw unless level).
    if (r.winner === 'A') expect(r.scoreA).toBeGreaterThan(r.scoreB);
    else if (r.winner === 'B') expect(r.scoreB).toBeGreaterThan(r.scoreA);
    else expect(r.scoreA).toBe(r.scoreB);
  });

  it('goals emit a GOAL event per goal (runningScore consistency)', () => {
    const r = getEngine(SportKey.HANDBALL).simulate(defaultMatchConfig(SportKey.HANDBALL, 9));
    const goalEvents = r.events.filter((e) => e.kind === 'GOAL');
    expect(goalEvents.length).toBe(r.scoreA + r.scoreB);
  });

  it('emits realistic handball flavour events', () => {
    const r = getEngine(SportKey.HANDBALL).simulate(defaultMatchConfig(SportKey.HANDBALL, 13));
    const kinds = new Set(r.events.map((e) => e.kind));
    expect(kinds.has('SAVE')).toBe(true);
    expect(kinds.has('SHOT_ON_GOAL')).toBe(true);
    expect(kinds.has('TURNOVER')).toBe(true);
    expect(kinds.has('SUSPENSION')).toBe(true);
    expect(kinds.has('PENALTY_7M')).toBe(true);
  });

  it('produces a 1st/2nd-half period breakdown', () => {
    const r = getEngine(SportKey.HANDBALL).simulate(defaultMatchConfig(SportKey.HANDBALL, 21));
    const stats = computeMatchStats(r);
    const labels = stats.periods.map((p) => p.label);
    expect(labels).toContain('1st half');
    expect(labels).toContain('2nd half');
  });

  it('player stats include goals, assists and saves', () => {
    const r = getEngine(SportKey.HANDBALL).simulate(defaultMatchConfig(SportKey.HANDBALL, 33));
    const stats = computePlayerStats(r);
    const anySaves = [...stats.A, ...stats.B].some((p) => (p.saves ?? 0) > 0);
    const anyGoals = [...stats.A, ...stats.B].some((p) => p.points > 0);
    expect(anyGoals).toBe(true);
    expect(anySaves).toBe(true);
  });
});
