import { SportKey, MatchConfig } from './core/MatchConfig';
import { SportEngine } from './core/SportEngine';
import { FootballEngine } from './sports/FootballEngine';
import { TennisEngine } from './sports/TennisEngine';
import { BasketballEngine } from './sports/BasketballEngine';
import { HockeyEngine } from './sports/HockeyEngine';
import { VolleyballEngine } from './sports/VolleyballEngine';
import { TableTennisEngine } from './sports/TableTennisEngine';
import { RugbyEngine } from './sports/RugbyEngine';
import { ESoccerEngine } from './sports/ESoccerEngine';
import { ESportEngine } from './sports/ESportEngine';

// Human-readable labels for each sport, shared by the options and history UI.
export const SPORT_LABEL: Record<SportKey, string> = {
  [SportKey.FOOTBALL]: 'Football',
  [SportKey.TENNIS]: 'Tennis',
  [SportKey.BASKETBALL]: 'Basketball',
  [SportKey.HOCKEY]: 'Ice Hockey',
  [SportKey.VOLLEYBALL]: 'Volleyball',
  [SportKey.TABLE_TENNIS]: 'Table Tennis',
  [SportKey.RUGBY]: 'Rugby',
  [SportKey.E_SOCCER]: 'E-Soccer',
  [SportKey.E_SPORT]: 'E-Sport',
};

// Returns the engine implementation for a given sport. All nine sports defined in
// SportKey now have an engine (M3 complete). Football, Tennis, Basketball, Hockey,
// Volleyball, Table Tennis, Rugby, E-Soccer and E-Sport are all implemented.
export function getEngine(sport: SportKey): SportEngine {
  switch (sport) {
    case SportKey.FOOTBALL:
      return new FootballEngine();
    case SportKey.TENNIS:
      return new TennisEngine();
    case SportKey.BASKETBALL:
      return new BasketballEngine();
    case SportKey.HOCKEY:
      return new HockeyEngine();
    case SportKey.VOLLEYBALL:
      return new VolleyballEngine();
    case SportKey.TABLE_TENNIS:
      return new TableTennisEngine();
    case SportKey.RUGBY:
      return new RugbyEngine();
    case SportKey.E_SOCCER:
      return new ESoccerEngine();
    case SportKey.E_SPORT:
      return new ESportEngine();
  }
}

// Builds a MatchConfig with the documented default options for a sport, so the UI
// can run any engine without a bespoke options form (agents.md §3–§4 defaults).
export function defaultMatchConfig(sport: SportKey, seed: number): MatchConfig {
  const mode = 'INSTANT' as const;
  switch (sport) {
    case SportKey.FOOTBALL:
      return { sport, mode, seed };
    case SportKey.HOCKEY:
      return { sport, mode, seed };
    case SportKey.E_SOCCER:
      return { sport, mode, seed };
    case SportKey.TENNIS:
      return { sport, mode, seed, options: { matchFormat: 'BO3' } };
    case SportKey.BASKETBALL:
      return { sport, mode, seed, options: { quarterLength: 12 } };
    case SportKey.VOLLEYBALL:
      return { sport, mode, seed, options: { sets: 'BO3' } };
    case SportKey.TABLE_TENNIS:
      return { sport, mode, seed, options: { matchFormat: 'BO5' } };
    case SportKey.RUGBY:
      return { sport, mode, seed, options: { code: 'UNION' } };
    case SportKey.E_SPORT:
      return { sport, mode, seed, options: { bestOf: 3, roundTarget: 13 } };
  }
}
