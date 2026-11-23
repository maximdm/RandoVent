import { SimResult, SportEventKind } from './core/EventTypes';
import { POINT_VALUE } from './playback';

export interface PlayerStat {
  name: string;
  points: number;
  fouls: number;
}

// Event kinds that count toward a player's discipline/foul tally. A `FOUL_OUT`
// is the *consequence* of reaching the personal-foul limit, not an extra foul, so
// it is excluded (the underlying FOUL events are already counted).
const FOUL_KINDS = new Set<SportEventKind>([
  'FOUL',
  'YELLOW_CARD',
  'RED_CARD',
  'PENALTY',
]);

// Derives per-team player leaderboards directly from the event log, so no engine
// needs to pre-aggregate. Works for any sport whose events carry `player` + `team`
// (football, basketball, hockey, rugby, volleyball). Individual sports (tennis,
// table-tennis, e-sport) emit no team-roster players, so they yield empty boards.
export function computePlayerStats(sim: SimResult): { A: PlayerStat[]; B: PlayerStat[] } {
  const acc: Record<'A' | 'B', Map<string, PlayerStat>> = {
    A: new Map(),
    B: new Map(),
  };

  for (const e of sim.events) {
    if (!e.player || (e.team !== 'A' && e.team !== 'B')) continue;
    let s = acc[e.team].get(e.player);
    if (!s) {
      s = { name: e.player, points: 0, fouls: 0 };
      acc[e.team].set(e.player, s);
    }
    const pv = POINT_VALUE[e.kind];
    if (pv) s.points += pv;
    if (FOUL_KINDS.has(e.kind)) s.fouls += 1;
  }

  const byScore = (a: PlayerStat, b: PlayerStat) => b.points - a.points || b.fouls - a.fouls;
  return {
    A: [...acc.A.values()].sort(byScore),
    B: [...acc.B.values()].sort(byScore),
  };
}

// Top N by a chosen metric (points for scorers, fouls for discipline leaders).
export function topBy(stats: PlayerStat[], metric: 'points' | 'fouls', n = 3): PlayerStat[] {
  return [...stats].sort((a, b) => b[metric] - a[metric]).slice(0, n);
}
