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
  | 'BREAK' // service break (returner won the game)
  | 'BREAK_POINT' // receiver one point from winning the server's game
  | 'ACE'
  | 'DOUBLE_FAULT'
  | 'WINNER'
  | 'UNFORCED_ERROR'
  | 'GAME'
  // Basketball
  | 'POINTS_2'
  | 'POINTS_3'
  | 'FREE_THROW'
  | 'FREE_THROW_MISS'
  | 'QUARTER_END'
  | 'MISS_SHOT'
  | 'REBOUND'
  | 'ASSIST'
  | 'STEAL'
  | 'BLOCK'
  | 'TURNOVER'
  // Hockey
  | 'PENALTY'
  | 'SHOOTOUT'
  | 'SHOT_ON_GOAL'
  | 'FACEOFF_WIN'
  | 'ICING'
  // Basketball
  | 'OVERTIME'
  | 'FOUL_OUT'
  | 'BONUS'
  // Volleyball
  | 'POINT'
  | 'KILL'
  | 'SERVE_ACE'
  | 'SERVE_ERROR'
  | 'ATTACK_ERROR'
  | 'RECEPTION_ERROR'
  | 'DIG'
  | 'SET_ASSIST'
  // Table Tennis
  | 'GAME_WIN'
  | 'NET_CORD'
  | 'EDGE_BALL'
  | 'LONG_RALLY'
  // Rugby
  | 'TRY'
  | 'CONVERSION'
  | 'PENALTY_GOAL'
  | 'DROP_GOAL'
  | 'TACKLE'
  | 'SCRUM'
  | 'LINEOUT'
  | 'KNOCK_ON'
  // Handball
  | 'PENALTY_7M' // 7-metre throw awarded (handball's penalty)
  | 'FAST_BREAK'
  | 'SUSPENSION' // 2-minute suspension
  // E-Sport
  | 'MAP_WIN'
  | 'KILL'
  | 'HEADSHOT'
  | 'ROUND_WIN'
  | 'BOMB_PLANT'
  | 'BOMB_DEFUSE'
  | 'OBJECTIVE_CAPTURE'
  | 'CLUTCH';

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
