// Engine-level event model. Pure data — no React, no UI concerns.
// The UI layer maps these into its own display type (see src/types.ts).

export type SportEventKind =
  | 'GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'CORNER'
  | 'OFFSIDE'
  | 'SAVE'
  | 'FOUL'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'MATCH_END'
  // Tennis
  | 'SET_WIN'
  | 'TIEBREAK'
  | 'DEUCE'
  | 'GAME'
  // Basketball
  | 'POINTS_2'
  | 'POINTS_3'
  | 'FREE_THROW'
  | 'FREE_THROW_MISS'
  | 'QUARTER_END'
  // Hockey
  | 'PENALTY'
  | 'SHOOTOUT'
  // Basketball
  | 'OVERTIME'
  | 'FOUL_OUT'
  | 'BONUS'
  // Volleyball
  | 'POINT'
  // Table Tennis
  | 'GAME_WIN'
  // Rugby
  | 'TRY'
  | 'CONVERSION'
  | 'PENALTY_GOAL'
  | 'DROP_GOAL'
  // E-Sport
  | 'MAP_WIN';

export interface SimEvent {
  id: string;
  minute: number; // match minute (0..90, plus stoppage)
  half: number; // period/half number (1, 2, 3...) — varies by sport
  kind: SportEventKind;
  team: 'A' | 'B' | null; // null for neutral/period markers
  player?: string;
  detail: string;
}

// Outcome returned by every SportEngine.simulate().
export interface SimResult {
  sport: string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'DRAW';
  events: SimEvent[];
  metadata: Record<string, unknown>;
}
