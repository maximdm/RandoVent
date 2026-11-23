import { SimEvent, SimResult, SportEventKind } from './core/EventTypes';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  currentMinute: number; // current playback position in match units (minutes/sets/maps)
  totalMinutes: number; // final position
  revealed: SimEvent[]; // events with minute <= currentMinute
  revealedCount: number;
  totalCount: number;
}

// Point/score delta contributed by each event kind. Set/game/map-winning events
// count as +1 toward that team's score (which is the scoreA/scoreB semantics for
// tennis/volleyball/table-tennis/e-sport).
const POINT_VALUE: Partial<Record<SportEventKind, number>> = {
  GOAL: 1,
  POINTS_2: 2,
  POINTS_3: 3,
  FREE_THROW: 1,
  TRY: 5,
  CONVERSION: 2,
  PENALTY_GOAL: 3,
  DROP_GOAL: 3,
};

function eventScoreDelta(kind: SportEventKind): number {
  const v = POINT_VALUE[kind];
  if (v !== undefined) return v;
  if (kind === 'SET_WIN' || kind === 'GAME_WIN' || kind === 'MAP_WIN') return 1;
  return 0;
}

// Running score from a revealed subset of events. For a fully revealed match this
// equals sim.scoreA / sim.scoreB; during Accelerated playback it tracks live.
export function runningScore(sim: SimResult, revealed: SimEvent[]): [number, number] {
  let a = 0;
  let b = 0;
  for (const e of revealed) {
    const d = eventScoreDelta(e.kind);
    if (e.team === 'A') a += d;
    else if (e.team === 'B') b += d;
  }
  return [a, b];
}

// Framework-free playback calculator. Instant and Accelerated both consume the
// identical SimResult (the engine output), so when Accelerated reaches the end its
// revealed log is byte-identical to the Instant log.
export class MatchPlayback {
  readonly totalMinutes: number;
  readonly totalCount: number;

  constructor(
    public readonly sim: SimResult,
    private readonly minutePerSecond = 2,
  ) {
    this.totalMinutes = sim.events.reduce((m, e) => Math.max(m, e.minute), 0) || 1;
    this.totalCount = sim.events.length;
  }

  snapshot(elapsedSeconds: number, status: PlaybackStatus): PlaybackSnapshot {
    const currentMinute =
      status === 'finished'
        ? this.totalMinutes
        : status === 'idle'
          ? 0
          : Math.min(this.totalMinutes, elapsedSeconds * this.minutePerSecond);
    const revealed =
      status === 'idle' ? [] : this.sim.events.filter((e) => e.minute <= currentMinute);
    return {
      status,
      currentMinute,
      totalMinutes: this.totalMinutes,
      revealed,
      revealedCount: revealed.length,
      totalCount: this.totalCount,
    };
  }

  get durationSeconds(): number {
    return this.totalMinutes / this.minutePerSecond;
  }
}
