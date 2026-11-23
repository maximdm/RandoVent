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
  | 'GAME'
  // Basketball
  | 'POINTS_2'
  | 'POINTS_3'
  | 'FREE_THROW'
  | 'QUARTER_END';

export interface SimEvent {
  id: string;
  minute: number; // match minute (0..90, plus stoppage)
  half: 1 | 2;
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
