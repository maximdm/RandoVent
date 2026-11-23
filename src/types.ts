// Shared, UI-agnostic match/event types used across screens and the engine.

export interface MatchEvent {
  id: string;
  minute: number;
  type: string;
  detail: string;
}

export interface SampleMatch {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
}
