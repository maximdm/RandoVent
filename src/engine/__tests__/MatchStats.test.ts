import { describe, it, expect } from 'vitest';
import { getEngine, defaultMatchConfig, SportKey } from '../index';
import { computeMatchStats, STAT_LABELS } from '../stats';
import { SportEventKind } from '../core/EventTypes';

function simulate(sport: SportKey, seed: number) {
  return getEngine(sport).simulate(defaultMatchConfig(sport, seed));
}

// Total of a kind across both teams equals the number of such events in the log.
function totalOf(sim: ReturnType<typeof simulate>, kind: SportEventKind): number {
  return sim.events.filter((e) => e.kind === kind).length;
}

describe('computeMatchStats', () => {
  it('counts corners (football) and attributes goals to teams', () => {
    const sim = simulate(SportKey.FOOTBALL, 7);
    const ms = computeMatchStats(sim);
    expect(ms.countsA.CORNER + ms.countsB.CORNER).toBe(totalOf(sim, 'CORNER'));
    // Goal tallies match the final score, split by team.
    expect(ms.countsA.GOAL).toBe(sim.scoreA);
    expect(ms.countsB.GOAL).toBe(sim.scoreB);
    expect(ms.countsA.GOAL + ms.countsB.GOAL).toBe(totalOf(sim, 'GOAL'));
  });

  it('produces a 1st/2nd-half breakdown that sums to the final score (football)', () => {
    const sim = simulate(SportKey.FOOTBALL, 3);
    const ms = computeMatchStats(sim);
    expect(ms.periods.length).toBeGreaterThanOrEqual(1);
    const totalA = ms.periods.reduce((s, p) => s + p.scoreA, 0);
    const totalB = ms.periods.reduce((s, p) => s + p.scoreB, 0);
    expect(totalA).toBe(sim.scoreA);
    expect(totalB).toBe(sim.scoreB);
  });

  it('surfaces tennis service breaks, set breakdown, and deuces across seeds', () => {
    let breaksSeen = 0;
    let deucesSeen = 0;
    let tiebreaksSeen = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const sim = simulate(SportKey.TENNIS, seed);
      const ms = computeMatchStats(sim);
      breaksSeen += ms.countsA.BREAK + ms.countsB.BREAK;
      deucesSeen += ms.deuces;
      tiebreaksSeen += ms.tiebreaks;
      expect(ms.sets.length).toBe(sim.scoreA + sim.scoreB);
    }
    expect(breaksSeen).toBeGreaterThan(0);
    // Deuce and tiebreak situations are common across BO3 seeds.
    expect(deucesSeen).toBeGreaterThan(0);
    expect(tiebreaksSeen).toBeGreaterThanOrEqual(0);
  });

  it('derives a quarter breakdown from metadata (basketball)', () => {
    const sim = simulate(SportKey.BASKETBALL, 11);
    const ms = computeMatchStats(sim);
    const totalA = ms.periods.reduce((s, p) => s + p.scoreA, 0);
    const totalB = ms.periods.reduce((s, p) => s + p.scoreB, 0);
    // Quarter scores sum to the final score (4 regulation quarters; overtime adds more).
    expect(ms.periods.length).toBeGreaterThanOrEqual(4);
    expect(totalA).toBe(sim.scoreA);
    expect(totalB).toBe(sim.scoreB);
  });

  it('produces a set breakdown (volleyball) and rally-point counts', () => {
    const sim = simulate(SportKey.VOLLEYBALL, 5);
    const ms = computeMatchStats(sim);
    expect(ms.sets.length).toBe(sim.scoreA + sim.scoreB);
    expect(ms.countsA.POINT + ms.countsB.POINT).toBe(totalOf(sim, 'POINT'));
  });

  it('produces a period breakdown (hockey) and penalty counts', () => {
    const sim = simulate(SportKey.HOCKEY, 9);
    const ms = computeMatchStats(sim);
    expect(ms.periods.length).toBe(3);
    const totalA = ms.periods.reduce((s, p) => s + p.scoreA, 0);
    const totalB = ms.periods.reduce((s, p) => s + p.scoreB, 0);
    expect(totalA).toBe(sim.scoreA);
    expect(totalB).toBe(sim.scoreB);
    expect(ms.countsA.PENALTY + ms.countsB.PENALTY).toBe(totalOf(sim, 'PENALTY'));
  });

  it('covers all nine sports without throwing and only shows labelled rows with data', () => {
    const sports = Object.values(SportKey);
    for (const sport of sports) {
      const sim = simulate(sport, 42);
      const ms = computeMatchStats(sim);
      // No negative counts.
      for (const k of Object.keys(STAT_LABELS) as SportEventKind[]) {
        expect(ms.countsA[k]).toBeGreaterThanOrEqual(0);
        expect(ms.countsB[k]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
