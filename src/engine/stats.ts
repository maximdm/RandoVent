import { SimResult, SportEventKind } from './core/EventTypes';
import { SportKey } from './core/MatchConfig';
import { POINT_VALUE } from './playback';

export interface PlayerStat {
  name: string;
  points: number;
  fouls: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  kills?: number;
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

// Box-score tallies (besides points/fouls) derived from the event log. Only kinds
// present here increment a player field; everything else is informational.
const BOX_VALUE: Partial<Record<SportEventKind, Partial<Record<keyof PlayerStat, number>>>> = {
  REBOUND: { rebounds: 1 },
  ASSIST: { assists: 1 },
  STEAL: { steals: 1 },
  BLOCK: { blocks: 1 },
  KILL: { kills: 1 },
};

// Derives per-team player leaderboards directly from the event log, so no engine
// needs to pre-aggregate. Works for any sport whose events carry `player` + `team`
// (football, basketball, hockey, rugby, volleyball). Individual sports (tennis,
// table-tennis, e-sport) emit no team-roster players, so they yield empty boards.
export function computePlayerStats(sim: SimResult): { A: PlayerStat[]; B: PlayerStat[] } {
  const acc: Record<'A' | 'B', Map<string, PlayerStat>> = {
    A: new Map(),
    B: new Map(),
  };

  const bump = (s: PlayerStat, kind: SportEventKind) => {
    const pv = POINT_VALUE[kind];
    if (pv) s.points += pv;
    if (FOUL_KINDS.has(kind)) s.fouls += 1;
    const bv = BOX_VALUE[kind];
    if (bv) {
      for (const k of Object.keys(bv) as (keyof PlayerStat)[]) {
        (s[k] as number) += bv[k] as number;
      }
    }
  };

  for (const e of sim.events) {
    if (!e.player || (e.team !== 'A' && e.team !== 'B')) continue;
    let s = acc[e.team].get(e.player);
    if (!s) {
      s = { name: e.player, points: 0, fouls: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, kills: 0 };
      acc[e.team].set(e.player, s);
    }
    bump(s, e.kind);
  }

  const byScore = (a: PlayerStat, b: PlayerStat) =>
    b.points - a.points || b.fouls - a.fouls;
  return {
    A: [...acc.A.values()].sort(byScore),
    B: [...acc.B.values()].sort(byScore),
  };
}

// Top N by a chosen metric (points for scorers, fouls for discipline leaders).
export function topBy(stats: PlayerStat[], metric: 'points' | 'fouls', n = 3): PlayerStat[] {
  return [...stats].sort((a, b) => b[metric] - a[metric]).slice(0, n);
}

// ---- Match-level statistics (per-team event tallies + period/set breakdowns) ----

// Friendly labels for the event kinds that are worth surfacing as a stat row.
// Only kinds present here are rendered, and only when at least one team has >0.
export const STAT_LABELS: Partial<Record<SportEventKind, string>> = {
  GOAL: 'Goals',
  CORNER: 'Corners',
  FOUL: 'Fouls',
  YELLOW_CARD: 'Yellow cards',
  RED_CARD: 'Red cards',
  SAVE: 'Saves',
  OFFSIDE: 'Offsides',
  SUBSTITUTION: 'Substitutions',
  PENALTY: 'Penalties',
  BREAK: 'Service breaks',
  POINTS_2: '2-pt shots',
  POINTS_3: '3-pt shots',
  FREE_THROW: 'Free throws (made)',
  FREE_THROW_MISS: 'Free throws (missed)',
  TRY: 'Tries',
  CONVERSION: 'Conversions',
  PENALTY_GOAL: 'Penalty goals',
  DROP_GOAL: 'Drop goals',
  POINT: 'Rally points',
  GAME: 'Games',
  GAME_WIN: 'Sets/maps won',
  SET_WIN: 'Sets/maps won',
  MAP_WIN: 'Sets/maps won',
  SHOOTOUT: 'Shootout goals',
  // Tennis / Table Tennis
  BREAK_POINT: 'Break points',
  ACE: 'Aces',
  DOUBLE_FAULT: 'Double faults',
  WINNER: 'Winners',
  UNFORCED_ERROR: 'Unforced errors',
  // Basketball
  MISS_SHOT: 'Missed shots',
  REBOUND: 'Rebounds',
  ASSIST: 'Assists',
  STEAL: 'Steals',
  BLOCK: 'Blocks',
  TURNOVER: 'Turnovers',
  // Hockey
  SHOT_ON_GOAL: 'Shots on goal',
  FACEOFF_WIN: 'Faceoffs won',
  ICING: 'Icings',
  // Volleyball
  KILL: 'Kills',
  SERVE_ACE: 'Serve aces',
  SERVE_ERROR: 'Serve errors',
  ATTACK_ERROR: 'Attack errors',
  RECEPTION_ERROR: 'Reception errors',
  DIG: 'Digs',
  SET_ASSIST: 'Set assists',
  // Table Tennis
  NET_CORD: 'Net cords',
  EDGE_BALL: 'Edge balls',
  LONG_RALLY: 'Long rallies',
  // Rugby
  TACKLE: 'Tackles',
  SCRUM: 'Scrums',
  LINEOUT: 'Lineouts',
  KNOCK_ON: 'Knock-ons',
  // E-Sport (KILL shares the "Kills" label with volleyball)
  HEADSHOT: 'Headshots',
  ROUND_WIN: 'Rounds won',
  BOMB_PLANT: 'Bomb plants',
  BOMB_DEFUSE: 'Bomb defuses',
  OBJECTIVE_CAPTURE: 'Objectives',
  CLUTCH: 'Clutches',
};

const ALL_KINDS: SportEventKind[] = [
  'GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'CORNER', 'OFFSIDE', 'SAVE',
  'FOUL', 'PERIOD_START', 'PERIOD_END', 'MATCH_END', 'SET_WIN', 'TIEBREAK', 'DEUCE',
  'BREAK', 'BREAK_POINT', 'ACE', 'DOUBLE_FAULT', 'WINNER', 'UNFORCED_ERROR', 'GAME',
  'POINTS_2', 'POINTS_3', 'FREE_THROW', 'FREE_THROW_MISS', 'MISS_SHOT', 'REBOUND',
  'ASSIST', 'STEAL', 'BLOCK', 'TURNOVER', 'QUARTER_END', 'PENALTY', 'SHOOTOUT',
  'SHOT_ON_GOAL', 'FACEOFF_WIN', 'ICING', 'OVERTIME', 'FOUL_OUT', 'BONUS', 'POINT',
  'KILL', 'SERVE_ACE', 'SERVE_ERROR', 'ATTACK_ERROR', 'RECEPTION_ERROR', 'DIG',
  'SET_ASSIST', 'GAME_WIN', 'NET_CORD', 'EDGE_BALL', 'LONG_RALLY', 'TRY',
  'CONVERSION', 'PENALTY_GOAL', 'DROP_GOAL', 'TACKLE', 'SCRUM', 'LINEOUT', 'KNOCK_ON',
  'MAP_WIN', 'HEADSHOT', 'ROUND_WIN', 'BOMB_PLANT', 'BOMB_DEFUSE', 'OBJECTIVE_CAPTURE',
  'CLUTCH',
];

function zeroCounts(): Record<SportEventKind, number> {
  const map = {} as Record<SportEventKind, number>;
  for (const k of ALL_KINDS) map[k] = 0;
  return map;
}

export interface PeriodStat {
  label: string;
  scoreA: number;
  scoreB: number;
}

export interface SetStat {
  label: string;
  scoreA: number;
  scoreB: number;
}

export interface MatchStats {
  sport: string;
  countsA: Record<SportEventKind, number>;
  countsB: Record<SportEventKind, number>;
  periods: PeriodStat[];
  sets: SetStat[];
  tiebreaks: number;
  deuces: number;
}

// Human label for a period number, varying by sport conventions.
function periodLabel(sport: string, half: number): string {
  switch (sport) {
    case SportKey.FOOTBALL:
    case SportKey.RUGBY:
      return half === 1 ? '1st half' : half === 2 ? '2nd half' : `Half ${half}`;
    case SportKey.HOCKEY:
      return `Period ${half}`;
    case SportKey.BASKETBALL:
      return half <= 4 ? `Q${half}` : `OT${half - 4}`;
    default:
      return `Period ${half}`;
  }
}

// Period breakdown. For basketball we use the authoritative quarter scores from
// metadata; for football/hockey/rugby we derive goals from the event log grouped
// by `half`. Set-based sports (tennis/volleyball/table-tennis) are handled by
// `computeSets` instead.
function computePeriods(sim: SimResult): PeriodStat[] {
  const meta = sim.metadata as { quarterScores?: Array<[number, number]> };
  if (Array.isArray(meta.quarterScores)) {
    return meta.quarterScores.map(([a, b], i) => ({
      label: i < 4 ? `Q${i + 1}` : `OT${i - 3}`,
      scoreA: a,
      scoreB: b,
    }));
  }
  const periodSports = new Set([SportKey.FOOTBALL, SportKey.HOCKEY, SportKey.RUGBY]);
  if (!periodSports.has(sim.sport as SportKey)) return [];

  // Collect every period that occurred (so a goalless period still shows 0-0),
  // then tally goals per period.
  const goalA = new Map<number, number>();
  const goalB = new Map<number, number>();
  const halves = new Set<number>();
  for (const e of sim.events) {
    if (e.half != null) halves.add(e.half);
    if (e.kind === 'GOAL' && e.team === 'A') goalA.set(e.half, (goalA.get(e.half) ?? 0) + 1);
    if (e.kind === 'GOAL' && e.team === 'B') goalB.set(e.half, (goalB.get(e.half) ?? 0) + 1);
  }
  return [...halves]
    .sort((x, y) => x - y)
    .map((h) => ({ label: periodLabel(sim.sport, h), scoreA: goalA.get(h) ?? 0, scoreB: goalB.get(h) ?? 0 }));
}

// Set/map/game breakdown from metadata (tennis, volleyball, table-tennis).
function computeSets(sim: SimResult): SetStat[] {
  const meta = sim.metadata as {
    setScores?: Array<[number, number]>;
    gameScores?: Array<[number, number]>;
  };
  const key: 'setScores' | 'gameScores' | null = meta.setScores
    ? 'setScores'
    : meta.gameScores
      ? 'gameScores'
      : null;
  if (!key) return [];
  const arr = (meta[key] as Array<[number, number]>);
  const isGame = key === 'gameScores';
  return arr.map(([a, b], i) => ({
    label: isGame ? `Game ${i + 1}` : `Set ${i + 1}`,
    scoreA: a,
    scoreB: b,
  }));
}

// Derives per-team match statistics directly from the event log, plus period and
// set breakdowns. Works for every sport because each engine emits its own event
// kinds — there is no per-sport special-casing beyond label/period conventions.
export function computeMatchStats(sim: SimResult): MatchStats {
  const countsA = zeroCounts();
  const countsB = zeroCounts();
  for (const e of sim.events) {
    if (e.team === 'A' || e.team === 'B') {
      const tgt = e.team === 'A' ? countsA : countsB;
      tgt[e.kind] = (tgt[e.kind] ?? 0) + 1;
    }
  }
  return {
    sport: sim.sport,
    countsA,
    countsB,
    periods: computePeriods(sim),
    sets: computeSets(sim),
    tiebreaks: sim.events.filter((e) => e.kind === 'TIEBREAK').length,
    deuces: sim.events.filter((e) => e.kind === 'DEUCE').length,
  };
}
