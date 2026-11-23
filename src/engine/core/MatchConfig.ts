// Canonical sport identifiers. Mirrors agents.md §8.
export enum SportKey {
  FOOTBALL = 'FOOTBALL',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  HOCKEY = 'HOCKEY',
  VOLLEYBALL = 'VOLLEYBALL',
  TABLE_TENNIS = 'TABLE_TENNIS',
  RUGBY = 'RUGBY',
  HANDBALL = 'HANDBALL',
  E_SOCCER = 'E_SOCCER',
  E_SPORT = 'E_SPORT',
}

// Optional custom participant names. All fields are optional; defaults apply
// when omitted (see agents.md §3).
export interface ParticipantConfig {
  teamAName?: string;
  teamBName?: string;
  teamARoster?: string[];
  teamBRoster?: string[];
  playerAName?: string;
  playerBName?: string;
}

export interface BaseMatchConfig {
  sport: SportKey;
  mode: 'INSTANT' | 'ACCELERATED';
  seed?: number;
  participants?: ParticipantConfig;
}

// Per-sport configurable options (defaults noted). Defined in agents.md §3–§4.
export interface TennisOptions {
  matchFormat: 'BO3' | 'BO5';
}
export interface BasketballOptions {
  quarterLength: 10 | 12;
}
export interface RugbyOptions {
  code: 'UNION' | 'LEAGUE';
}
export interface TableTennisOptions {
  matchFormat: 'BO5' | 'BO7';
}
export interface VolleyballOptions {
  sets: 'BO3' | 'BO5';
}
export interface ESportOptions {
  bestOf: 1 | 3 | 5;
  roundTarget?: 13 | 16;
}

// Football, E-Soccer and Hockey have no extra options beyond BaseMatchConfig.
// Discriminant uses SportKey member types (not raw string literals) so the
// engines and UI can narrow with `config.sport === SportKey.X`.
export type MatchConfig =
  | (BaseMatchConfig & { sport: SportKey.TENNIS; options: TennisOptions })
  | (BaseMatchConfig & { sport: SportKey.BASKETBALL; options: BasketballOptions })
  | (BaseMatchConfig & { sport: SportKey.RUGBY; options: RugbyOptions })
  | (BaseMatchConfig & { sport: SportKey.TABLE_TENNIS; options: TableTennisOptions })
  | (BaseMatchConfig & { sport: SportKey.VOLLEYBALL; options: VolleyballOptions })
  | (BaseMatchConfig & { sport: SportKey.E_SPORT; options: ESportOptions })
  | (BaseMatchConfig & { sport: SportKey.FOOTBALL; options?: Record<string, never> })
  | (BaseMatchConfig & { sport: SportKey.E_SOCCER; options?: Record<string, never> })
  | (BaseMatchConfig & { sport: SportKey.HOCKEY; options?: Record<string, never> })
  | (BaseMatchConfig & { sport: SportKey.HANDBALL; options?: Record<string, never> });

// Lottery generator config (agents.md §7).
export interface LotteryConfig {
  count: number;
  min: number;
  max: number;
  allowDuplicates?: boolean;
  sorted?: boolean;
  sets?: number;
  seed?: number;
}
