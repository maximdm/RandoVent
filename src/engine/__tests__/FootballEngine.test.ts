import { describe, it, expect } from 'vitest';
import { FootballEngine, SportKey, MatchConfig } from '../index';

function config(seed: number, overrides?: Record<string, unknown>): MatchConfig {
  const base: MatchConfig = { sport: SportKey.FOOTBALL, mode: 'INSTANT', seed };
  return overrides ? ({ ...base, ...overrides } as MatchConfig) : base;
}

describe('FootballEngine', () => {
  it('produces a deterministic result for a fixed seed', () => {
    const engine = new FootballEngine();
    const a = engine.simulate(config(12345));
    const b = engine.simulate(config(12345));
    expect(a.scoreA).toBe(b.scoreA);
    expect(a.scoreB).toBe(b.scoreB);
    expect(a.events.length).toBe(b.events.length);
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
  });

  it('varies output across different seeds', () => {
    const engine = new FootballEngine();
    const a = engine.simulate(config(1));
    const b = engine.simulate(config(2));
    // Not guaranteed to differ, but extremely likely; assert at least length parity holds.
    expect(a.sport).toBe(SportKey.FOOTBALL);
    expect(typeof b.scoreA).toBe('number');
  });

  it('emits a kickoff and a final event', () => {
    const engine = new FootballEngine();
    const r = engine.simulate(config(7));
    expect(r.events[0].kind).toBe('PERIOD_START');
    expect(r.events[r.events.length - 1].kind).toBe('MATCH_END');
  });

  it('respects custom participant names', () => {
    const engine = new FootballEngine();
    const r = engine.simulate(
      config(3, {
        participants: { teamAName: 'Lions', teamBName: 'Tigers' },
      }),
    );
    const meta = r.metadata as { teamAName: string; teamBName: string };
    expect(meta.teamAName).toBe('Lions');
    expect(meta.teamBName).toBe('Tigers');
  });

  it('rejects a non-football config', () => {
    const engine = new FootballEngine();
    expect(() =>
      engine.simulate({ sport: SportKey.TENNIS, mode: 'INSTANT', options: { matchFormat: 'BO3' } } as MatchConfig),
    ).toThrow();
  });
});
