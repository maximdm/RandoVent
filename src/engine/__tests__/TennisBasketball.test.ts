import { describe, it, expect } from 'vitest';
import { getEngine, SportKey, MatchConfig } from '../index';

function tennisConfig(seed: number, format: 'BO3' | 'BO5' = 'BO3'): MatchConfig {
  return { sport: SportKey.TENNIS, mode: 'INSTANT', seed, options: { matchFormat: format } };
}

function basketballConfig(seed: number, qLen: 10 | 12 = 12): MatchConfig {
  return { sport: SportKey.BASKETBALL, mode: 'INSTANT', seed, options: { quarterLength: qLen } };
}

describe('TennisEngine', () => {
  it('is deterministic for a fixed seed', () => {
    const e = getEngine(SportKey.TENNIS);
    const a = e.simulate(tennisConfig(123));
    const b = e.simulate(tennisConfig(123));
    expect(a.scoreA).toBe(b.scoreA);
    expect(a.scoreB).toBe(b.scoreB);
    expect(a.events.map((ev) => ev.id)).toEqual(b.events.map((ev) => ev.id));
  });

  it('produces a winner by sets (BO3 -> first to 2)', () => {
    const r = getEngine(SportKey.TENNIS).simulate(tennisConfig(42, 'BO3'));
    // First to 2 sets wins; loser has 0 or 1, so total is 2 or 3.
    expect(r.winner === 'A' ? r.scoreA : r.scoreB).toBe(2);
    expect(r.scoreA + r.scoreB).toBeGreaterThanOrEqual(2);
    expect(r.scoreA + r.scoreB).toBeLessThanOrEqual(3);
    expect(['A', 'B']).toContain(r.winner);
  });

  it('BO5 requires 3 sets to win', () => {
    const r = getEngine(SportKey.TENNIS).simulate(tennisConfig(7, 'BO5'));
    expect(r.winner === 'A' ? r.scoreA : r.scoreB).toBe(3);
    expect(r.scoreA + r.scoreB).toBeGreaterThanOrEqual(3);
    expect(r.scoreA + r.scoreB).toBeLessThanOrEqual(5);
  });

  it('ends with a MATCH_END event', () => {
    const r = getEngine(SportKey.TENNIS).simulate(tennisConfig(5));
    expect(r.events[r.events.length - 1].kind).toBe('MATCH_END');
  });
});

describe('BasketballEngine', () => {
  it('is deterministic for a fixed seed', () => {
    const e = getEngine(SportKey.BASKETBALL);
    const a = e.simulate(basketballConfig(321));
    const b = e.simulate(basketballConfig(321));
    expect(a.scoreA).toBe(b.scoreA);
    expect(a.scoreB).toBe(b.scoreB);
  });

  it('produces 4 quarters worth of events and a final', () => {
    const r = getEngine(SportKey.BASKETBALL).simulate(basketballConfig(99, 12));
    const quarters = r.events.filter((e) => e.kind === 'QUARTER_END').length;
    expect(quarters).toBe(4);
    expect(r.events[r.events.length - 1].kind).toBe('MATCH_END');
  });

  it('10-minute quarters yield a lower total than 12-minute for same seed', () => {
    const a = getEngine(SportKey.BASKETBALL).simulate(basketballConfig(555, 10));
    const b = getEngine(SportKey.BASKETBALL).simulate(basketballConfig(555, 12));
    expect(a.scoreA + a.scoreB).toBeLessThan(b.scoreA + b.scoreB);
  });
});

describe('getEngine registry', () => {
  it('throws for unimplemented sports', () => {
    expect(() => getEngine(SportKey.HOCKEY)).toThrow();
  });
});
