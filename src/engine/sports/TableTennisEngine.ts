import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, bernoulli, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// Games to 11 (win by 2). BO5 / BO7 best-of series.
export class TableTennisEngine implements SportEngine {
  readonly sport = SportKey.TABLE_TENNIS;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.TABLE_TENNIS) {
      throw new Error(`TableTennisEngine received unsupported sport: ${config.sport}`);
    }
    const opts = (config.options ?? {}) as { matchFormat: 'BO5' | 'BO7' };
    const bestOf = opts.matchFormat === 'BO7' ? 7 : 5;
    const gamesToWin = Math.ceil(bestOf / 2);

    const rng = createRng(config.seed ?? 0);
    const playerA = config.participants?.playerAName ?? 'Player A';
    const playerB = config.participants?.playerBName ?? 'Player B';
    const pA = clamp(normal(0.5, 0.04, rng), 0.3, 0.7);

    const events: SimEvent[] = [];
    const id = createIdFactory('p');

    const gameScores: Array<[number, number]> = [];
    let gamesA = 0;
    let gamesB = 0;
    let gameNum = 1;

    while (gamesA < gamesToWin && gamesB < gamesToWin) {
      let a = 0;
      let b = 0;
      while (true) {
        if (bernoulli(pA, rng)) a++;
        else b++;
        if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) break;
        if (a > 21 || b > 21) break;
      }
      gameScores.push([a, b]);
      const w: 'A' | 'B' = a > b ? 'A' : 'B';
      if (w === 'A') gamesA++;
      else gamesB++;
      events.push({ id: id(), minute: gameNum, half: 1, kind: 'GAME_WIN', team: w, detail: `Game ${gameNum}: ${playerA} ${a}-${b} ${playerB}` });
      gameNum++;
    }

    events.push({ id: id(), minute: gameNum - 1, half: 1, kind: 'MATCH_END', team: gamesA > gamesB ? 'A' : 'B', detail: `Final: ${playerA} ${gamesA}-${gamesB} ${playerB}` });

    return {
      sport: this.sport,
      scoreA: gamesA,
      scoreB: gamesB,
      winner: gamesA > gamesB ? 'A' : 'B',
      events,
      metadata: { playerA, playerB, gameScores, matchFormat: opts.matchFormat },
    };
  }
}
