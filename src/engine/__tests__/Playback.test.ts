import { describe, it, expect } from 'vitest';
import { getEngine, defaultMatchConfig, SportKey, runningScore, MatchPlayback } from '../index';

// Helper: fully revealed snapshot equals the complete event log (Instant == Accelerated end state).
describe('MatchPlayback (M4)', () => {
  const sports = [
    SportKey.FOOTBALL,
    SportKey.TENNIS,
    SportKey.BASKETBALL,
    SportKey.HOCKEY,
    SportKey.VOLLEYBALL,
    SportKey.TABLE_TENNIS,
    SportKey.RUGBY,
    SportKey.E_SOCCER,
    SportKey.E_SPORT,
  ];

  for (const sport of sports) {
    it(`${sport}: Accelerated end state reveals the identical log as Instant`, () => {
      const sim = getEngine(sport).simulate(defaultMatchConfig(sport, 777));
      const pb = new MatchPlayback(sim, 2);
      // Reveal everything by jumping to the end.
      const end = pb.snapshot(pb.durationSeconds, 'finished');
      expect(end.revealed.map((e) => e.id)).toEqual(sim.events.map((e) => e.id));
      expect(end.revealedCount).toBe(sim.events.length);
    });

    it(`${sport}: revealed events are monotonic (minute <= currentMinute)`, () => {
      const sim = getEngine(sport).simulate(defaultMatchConfig(sport, 888));
      const pb = new MatchPlayback(sim, 2);
      for (const t of [0, 0.5, 1, 2.5, pb.durationSeconds]) {
        const snap = pb.snapshot(t, 'playing');
        for (const e of snap.revealed) {
          expect(e.minute).toBeLessThanOrEqual(snap.currentMinute + 1e-9);
        }
      }
    });

    it(`${sport}: runningScore over all events equals the final score`, () => {
      const sim = getEngine(sport).simulate(defaultMatchConfig(sport, 999));
      const [a, b] = runningScore(sim, sim.events);
      expect(a).toBe(sim.scoreA);
      expect(b).toBe(sim.scoreB);
    });
  }

  it('runningScore accumulates during playback for a goal sport', () => {
    const sim = getEngine(SportKey.FOOTBALL).simulate(defaultMatchConfig(SportKey.FOOTBALL, 42));
    const goals = sim.events.filter((e) => e.kind === 'GOAL');
    // Running score after revealing the first goal equals 1 for the scoring team.
    if (goals.length > 0) {
      const first = goals[0];
      const [a, b] = runningScore(sim, [first]);
      expect(first.team === 'A' ? a : b).toBe(1);
    }
  });
});
