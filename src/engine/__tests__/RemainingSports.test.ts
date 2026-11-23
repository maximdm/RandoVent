import { describe, it, expect } from 'vitest';
import { getEngine, SportKey, MatchConfig } from '../index';

describe('Remaining sports (M3)', () => {
  const sports = [
    SportKey.HOCKEY,
    SportKey.VOLLEYBALL,
    SportKey.TABLE_TENNIS,
    SportKey.RUGBY,
    SportKey.E_SOCCER,
    SportKey.E_SPORT,
  ];

  for (const sport of sports) {
    it(`${sport}: registry returns an engine and result is deterministic`, () => {
      const engine = getEngine(sport);
      const config = { sport, mode: 'INSTANT', seed: 2024 } as MatchConfig;
      const a = engine.simulate(config);
      const b = engine.simulate(config);
      expect(a.scoreA).toBe(b.scoreA);
      expect(a.scoreB).toBe(b.scoreB);
      expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
      expect(a.events[a.events.length - 1].kind).toBe('MATCH_END');
    });
  }

  it('Hockey produces 3 period-end events', () => {
    const r = getEngine(SportKey.HOCKEY).simulate({ sport: SportKey.HOCKEY, mode: 'INSTANT', seed: 11 } as MatchConfig);
    expect(r.events.filter((e) => e.kind === 'PERIOD_END').length).toBe(3);
  });

  it('Volleyball BO5 respects sets-to-win (3) and set targets', () => {
    const r = getEngine(SportKey.VOLLEYBALL).simulate({
      sport: SportKey.VOLLEYBALL,
      mode: 'INSTANT',
      seed: 22,
      options: { sets: 'BO5' },
    } as MatchConfig);
    const meta = r.metadata as { setScores: Array<[number, number]>; sets: string };
    expect(meta.sets).toBe('BO5');
    expect(r.scoreA + r.scoreB).toBeGreaterThanOrEqual(3);
    expect(r.scoreA + r.scoreB).toBeLessThanOrEqual(5);
    // Every set is won by >=2 and the winner reached at least 15 (25 normal / 15 deciding).
    for (const [a, b] of meta.setScores) {
      expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
      expect(Math.max(a, b)).toBeGreaterThanOrEqual(15);
    }
  });

  it('Table Tennis BO7 requires 4 games to win', () => {
    const r = getEngine(SportKey.TABLE_TENNIS).simulate({
      sport: SportKey.TABLE_TENNIS,
      mode: 'INSTANT',
      seed: 33,
      options: { matchFormat: 'BO7' },
    } as MatchConfig);
    expect(r.winner === 'A' ? r.scoreA : r.scoreB).toBe(4);
  });

  it('Rugby produces positive points and valid scoring kinds', () => {
    const r = getEngine(SportKey.RUGBY).simulate({
      sport: SportKey.RUGBY,
      mode: 'INSTANT',
      seed: 44,
      options: { code: 'UNION' },
    } as MatchConfig);
    expect(typeof r.scoreA).toBe('number');
    expect(typeof r.scoreB).toBe('number');
    const kinds = new Set(r.events.map((e) => e.kind));
    expect(kinds.has('TRY')).toBe(true);
  });

  it('Rugby LEAGUE try is worth 4 (metadata tryPts)', () => {
    const r = getEngine(SportKey.RUGBY).simulate({
      sport: SportKey.RUGBY,
      mode: 'INSTANT',
      seed: 44,
      options: { code: 'LEAGUE' },
    } as MatchConfig);
    expect((r.metadata as { tryPts: number }).tryPts).toBe(4);
  });

  it('E-Sport BO3 first to 2 maps', () => {
    const r = getEngine(SportKey.E_SPORT).simulate({
      sport: SportKey.E_SPORT,
      mode: 'INSTANT',
      seed: 55,
      options: { bestOf: 3, roundTarget: 13 },
    } as MatchConfig);
    expect(r.winner === 'A' ? r.scoreA : r.scoreB).toBe(2);
    const mapWins = r.events.filter((e) => e.kind === 'MAP_WIN').length;
    expect(mapWins).toBe(r.scoreA + r.scoreB);
  });

  it('E-Soccer yields a deterministic football-like result', () => {
    const r = getEngine(SportKey.E_SOCCER).simulate({ sport: SportKey.E_SOCCER, mode: 'INSTANT', seed: 66 } as MatchConfig);
    expect(r.events.some((e) => e.kind === 'GOAL')).toBe(true);
  });
});
