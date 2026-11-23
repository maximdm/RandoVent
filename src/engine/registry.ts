import { SportKey } from './core/MatchConfig';
import { SportEngine } from './core/SportEngine';
import { FootballEngine } from './sports/FootballEngine';
import { TennisEngine } from './sports/TennisEngine';
import { BasketballEngine } from './sports/BasketballEngine';

// Returns the engine implementation for a given sport. Engines not yet built
// (Hockey, Volleyball, Table Tennis, Rugby, E-Soccer, E-Sport) throw so the UI
// can disable those selections until M3 lands. Football, Tennis and Basketball
// are implemented now (M1/M2/M3).
export function getEngine(sport: SportKey): SportEngine {
  switch (sport) {
    case SportKey.FOOTBALL:
      return new FootballEngine();
    case SportKey.TENNIS:
      return new TennisEngine();
    case SportKey.BASKETBALL:
      return new BasketballEngine();
    default:
      throw new Error(`No engine implemented yet for sport: ${sport}`);
  }
}
