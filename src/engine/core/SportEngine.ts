import { MatchConfig, SportKey } from './MatchConfig';
import { SimResult } from './EventTypes';

// Base contract every sport engine implements (agents.md §6 determinism + §8).
export interface SportEngine {
  readonly sport: SportKey;
  simulate(config: MatchConfig): SimResult;
}

// Registry of available engines, keyed by SportKey.
export type EngineRegistry = Partial<Record<SportKey, SportEngine>>;
