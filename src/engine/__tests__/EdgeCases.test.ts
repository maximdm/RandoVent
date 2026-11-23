import { describe, it, expect } from 'vitest';
import {
  getEngine,
  defaultMatchConfig,
  SportKey,
  MatchConfig,
  LotteryError,
  generateLottery,
  applyRedCardPenalty,
  computePlayerStats,
  topBy,
} from '../index';

// M6 — edge-case coverage: deuce/tiebreak bounds, red-card strength, overtime,
// shootout, lottery boundaries, and broad determinism across many seeds.
describe('M6 edge cases', () => {
  it('applyRedCardPenalty reduces scoring strength per sending-off', () => {
    expect(applyRedCardPenalty(2, 0)).toBe(2);
    expect(applyRedCardPenalty(2, 1)).toBeCloseTo(1.7, 5); // 2 * 0.85
    expect(applyRedCardPenalty(2, 2)).toBeLessThan(applyRedCardPenalty(2, 1));
    expect(() => applyRedCardPenalty(2, -1)).toThrow();
  });

  it('Tennis: every set reaches target and is won by >=2 across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = getEngine(SportKey.TENNIS).simulate({
        sport: SportKey.TENNIS,
        mode: 'INSTANT',
        seed,
        options: { matchFormat: seed % 2 ? 'BO3' : 'BO5' },
      } as MatchConfig);
      const scores = (r.metadata as { setScores: Array<[number, number]> }).setScores;
      expect(scores.length).toBeGreaterThanOrEqual(2);
      for (const [a, b] of scores) {
        const win = Math.max(a, b);
        const diff = Math.abs(a - b);
        expect(win).toBeGreaterThanOrEqual(6);
        // A set is won by >=2, except a valid 7-6 tiebreak (win by 1).
        expect(win >= 7 && diff === 1 ? true : diff >= 2).toBe(true);
      }
      // Match ends with a MATCH_END and a winner.
      expect(r.events[r.events.length - 1].kind).toBe('MATCH_END');
      expect(r.winner === 'A' || r.winner === 'B').toBe(true);
    }
  });

  it('Table Tennis: every game to 11 win-by-2 across many seeds', () => {
    for (let seed = 0; seed < 150; seed++) {
      const r = getEngine(SportKey.TABLE_TENNIS).simulate({
        sport: SportKey.TABLE_TENNIS,
        mode: 'INSTANT',
        seed,
        options: { matchFormat: seed % 2 ? 'BO5' : 'BO7' },
      } as MatchConfig);
      const scores = (r.metadata as { gameScores: Array<[number, number]> }).gameScores;
      for (const [a, b] of scores) {
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(11);
      }
    }
  });

  it('Volleyball: sets to 25 (or 15 deciding) win-by-2, never an impossible score', () => {
    for (let seed = 0; seed < 150; seed++) {
      const r = getEngine(SportKey.VOLLEYBALL).simulate({
        sport: SportKey.VOLLEYBALL,
        mode: 'INSTANT',
        seed,
        options: { sets: seed % 2 ? 'BO3' : 'BO5' },
      } as MatchConfig);
      const scores = (r.metadata as { setScores: Array<[number, number]> }).setScores;
      for (const [a, b] of scores) {
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(2);
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('Hockey: never ends in a draw (shootout resolves ties)', () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = getEngine(SportKey.HOCKEY).simulate({ sport: SportKey.HOCKEY, mode: 'INSTANT', seed } as MatchConfig);
      expect(r.winner === 'DRAW').toBe(false);
      expect(r.winner === 'A' || r.winner === 'B').toBe(true);
    }
  });

  it('Hockey: produces a SHOOTOUT event whenever regulation is tied', () => {
    let sawShootout = false;
    for (let seed = 0; seed < 500; seed++) {
      const r = getEngine(SportKey.HOCKEY).simulate({ sport: SportKey.HOCKEY, mode: 'INSTANT', seed } as MatchConfig);
      const tiedReg = r.scoreA === r.scoreB;
      const hasShootout = r.events.some((e) => e.kind === 'SHOOTOUT');
      if (tiedReg) expect(hasShootout).toBe(true);
      if (hasShootout) sawShootout = true;
    }
    expect(sawShootout).toBe(true); // the generator does reach ties sometimes
  });

  it('Basketball: resolves ties via overtime (no draw after regulation tie)', () => {
    let sawOT = false;
    for (let seed = 0; seed < 500; seed++) {
      const r = getEngine(SportKey.BASKETBALL).simulate({
        sport: SportKey.BASKETBALL,
        mode: 'INSTANT',
        seed,
        options: { quarterLength: 12 },
      } as MatchConfig);
      if (r.events.some((e) => e.kind === 'OVERTIME')) sawOT = true;
      expect(r.winner === 'A' || r.winner === 'B').toBe(true);
    }
    expect(sawOT).toBe(true);
  });

  it('Basketball: produces fouls, a bonus, and foul-outs across many seeds', () => {
    let sawFoul = false;
    let sawBonus = false;
    let sawFoulOut = false;
    for (let seed = 0; seed < 800; seed++) {
      const r = getEngine(SportKey.BASKETBALL).simulate({
        sport: SportKey.BASKETBALL,
        mode: 'INSTANT',
        seed,
        options: { quarterLength: 12 },
      } as MatchConfig);
      const kinds = r.events.map((e) => e.kind);
      if (kinds.includes('FOUL')) sawFoul = true;
      if (kinds.includes('BONUS')) sawBonus = true;
      if (kinds.includes('FOUL_OUT')) sawFoulOut = true;
      // Every foul-out is preceded by a 5th personal foul for that player.
      for (const e of r.events) {
        if (e.kind === 'FOUL_OUT') {
          const fouls = r.events.filter(
            (x) => x.kind === 'FOUL' && x.player === e.player && x.team === e.team,
          ).length;
          expect(fouls).toBeGreaterThanOrEqual(5);
        }
      }
    }
    expect(sawFoul).toBe(true);
    expect(sawBonus).toBe(true);
    expect(sawFoulOut).toBe(true);
  });

  it('Basketball: 10-min quarters yield a lower total than 12-min for same seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      const a = getEngine(SportKey.BASKETBALL).simulate({
        sport: SportKey.BASKETBALL,
        mode: 'INSTANT',
        seed,
        options: { quarterLength: 10 },
      } as MatchConfig);
      const b = getEngine(SportKey.BASKETBALL).simulate({
        sport: SportKey.BASKETBALL,
        mode: 'INSTANT',
        seed,
        options: { quarterLength: 12 },
      } as MatchConfig);
      expect(a.scoreA + a.scoreB).toBeLessThanOrEqual(b.scoreA + b.scoreB);
    }
  });

  it('Football: red cards reduce effective lambda and appear as events', () => {
    let sawRed = false;
    for (let seed = 0; seed < 300; seed++) {
      const r = getEngine(SportKey.FOOTBALL).simulate({ sport: SportKey.FOOTBALL, mode: 'INSTANT', seed } as MatchConfig);
      if (r.events.some((e) => e.kind === 'RED_CARD')) sawRed = true;
      const meta = r.metadata as { lambdaA: number; lambdaAeff: number; redCardsA: number };
      if (meta.redCardsA > 0) expect(meta.lambdaAeff).toBeLessThan(meta.lambdaA);
    }
    expect(sawRed).toBe(true);
  });

  it('Football: scores stay within a realistic upper bound across many seeds', () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = getEngine(SportKey.FOOTBALL).simulate({ sport: SportKey.FOOTBALL, mode: 'INSTANT', seed } as MatchConfig);
      expect(r.scoreA).toBeLessThanOrEqual(12);
      expect(r.scoreB).toBeLessThanOrEqual(12);
    }
  });

  it('Lottery: strict boundary validation', () => {
    expect(() => generateLottery({ count: 50, min: 1, max: 49 })).toThrow(LotteryError);
    expect(() => generateLottery({ count: 1, min: 10, max: 1 })).toThrow(LotteryError);
    expect(() => generateLottery({ count: 0, min: 1, max: 49 })).toThrow(LotteryError); // count >= 1
    expect(() => generateLottery({ count: 6, min: 1, max: 49, sets: 0 })).toThrow(LotteryError); // sets >= 1
    // Duplicates allowed => count may exceed the unique range.
    expect(() => generateLottery({ count: 60, min: 1, max: 49, allowDuplicates: true })).not.toThrow();
  });

  it('Engine rejects a mismatched sport config', () => {
    expect(() =>
      getEngine(SportKey.FOOTBALL).simulate({ sport: SportKey.TENNIS, mode: 'INSTANT', options: { matchFormat: 'BO3' } } as MatchConfig),
    ).toThrow();
    expect(() =>
      getEngine(SportKey.RUGBY).simulate({ sport: SportKey.BASKETBALL, mode: 'INSTANT', options: { quarterLength: 12 } } as MatchConfig),
    ).toThrow();
  });

  it('Determinism holds across many seeds for every sport', () => {
    const sports = [
      SportKey.FOOTBALL, SportKey.TENNIS, SportKey.BASKETBALL, SportKey.HOCKEY,
      SportKey.VOLLEYBALL, SportKey.TABLE_TENNIS, SportKey.RUGBY, SportKey.E_SOCCER, SportKey.E_SPORT,
    ];
    for (const sport of sports) {
      for (let seed = 1; seed <= 50; seed++) {
        const a = getEngine(sport).simulate(defaultMatchConfig(sport, seed));
        const b = getEngine(sport).simulate(defaultMatchConfig(sport, seed));
        expect(a.scoreA).toBe(b.scoreA);
        expect(a.scoreB).toBe(b.scoreB);
        expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
      }
    }
  });

  it('Player attribution: basketball points/fouls tally exactly to team totals', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = getEngine(SportKey.BASKETBALL).simulate({
        sport: SportKey.BASKETBALL,
        mode: 'INSTANT',
        seed,
        options: { quarterLength: 12 },
      } as MatchConfig);
      const stats = computePlayerStats(r);
      const sumPts = (rows: { points: number }[]) => rows.reduce((s, p) => s + p.points, 0);
      const sumFouls = (rows: { fouls: number }[]) => rows.reduce((s, p) => s + p.fouls, 0);
      expect(sumPts(stats.A)).toBe(r.scoreA);
      expect(sumPts(stats.B)).toBe(r.scoreB);
      const foulEventsA = r.events.filter((e) => e.kind === 'FOUL' && e.team === 'A').length;
      const foulEventsB = r.events.filter((e) => e.kind === 'FOUL' && e.team === 'B').length;
      expect(sumFouls(stats.A)).toBe(foulEventsA);
      expect(sumFouls(stats.B)).toBe(foulEventsB);
    }
  });

  it('Player attribution: football scorers/foul leaders derive from the log', () => {
    let sawScorer = false;
    for (let seed = 0; seed < 200; seed++) {
      const r = getEngine(SportKey.FOOTBALL).simulate({ sport: SportKey.FOOTBALL, mode: 'INSTANT', seed } as MatchConfig);
      const stats = computePlayerStats(r);
      if (stats.A.length > 0 || stats.B.length > 0) sawScorer = true;
      // Sum of goal-points equals goals scored.
      const goalPtsA = stats.A.reduce((s, p) => s + p.points, 0);
      const goalEventsA = r.events.filter((e) => e.kind === 'GOAL' && e.team === 'A').length;
      expect(goalPtsA).toBe(goalEventsA);
    }
    expect(sawScorer).toBe(true);
  });

  it('Deuce badge: tennis emits DEUCE events across many seeds', () => {
    let sawDeuce = false;
    for (let seed = 0; seed < 400; seed++) {
      const r = getEngine(SportKey.TENNIS).simulate({
        sport: SportKey.TENNIS,
        mode: 'INSTANT',
        seed,
        options: { matchFormat: 'BO3' },
      } as MatchConfig);
      if (r.events.some((e) => e.kind === 'DEUCE')) sawDeuce = true;
    }
    expect(sawDeuce).toBe(true);
  });

  it('Deuce badge: volleyball emits DEUCE at set point and attributes points', () => {
    let sawDeuce = false;
    for (let seed = 0; seed < 400; seed++) {
      const r = getEngine(SportKey.VOLLEYBALL).simulate({
        sport: SportKey.VOLLEYBALL,
        mode: 'INSTANT',
        seed,
        options: { sets: 'BO5' },
      } as MatchConfig);
      if (r.events.some((e) => e.kind === 'DEUCE')) sawDeuce = true;
      const stats = computePlayerStats(r);
      // Every rally point is attributed to a player on a team.
      const ptsEvents = r.events.filter((e) => e.kind === 'POINT').length;
      const attributed = r.events.filter((e) => e.kind === 'POINT' && !!e.player && (e.team === 'A' || e.team === 'B')).length;
      expect(attributed).toBe(ptsEvents);
      expect(stats.A.length).toBeGreaterThan(0);
      expect(stats.B.length).toBeGreaterThan(0);
    }
    expect(sawDeuce).toBe(true);
  });

  it('Player attribution: hockey goals + penalties derive from the log', () => {
    let sawPenalty = false;
    for (let seed = 0; seed < 200; seed++) {
      const r = getEngine(SportKey.HOCKEY).simulate({ sport: SportKey.HOCKEY, mode: 'INSTANT', seed } as MatchConfig);
      const stats = computePlayerStats(r);
      if (r.events.some((e) => e.kind === 'PENALTY')) sawPenalty = true;
      const goalPtsA = stats.A.reduce((s, p) => s + p.points, 0);
      const goalEventsA = r.events.filter((e) => e.kind === 'GOAL' && e.team === 'A').length;
      expect(goalPtsA).toBe(goalEventsA);
    }
    expect(sawPenalty).toBe(true);
  });

  it('topBy returns the highest-metric players, capped at n', () => {
    const data = [
      { name: 'x', points: 2, fouls: 0 },
      { name: 'y', points: 9, fouls: 1 },
      { name: 'z', points: 5, fouls: 3 },
      { name: 'w', points: 1, fouls: 0 },
    ];
    const top = topBy(data, 'points', 2);
    expect(top.map((p) => p.name)).toEqual(['y', 'z']);
  });
});
