import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, bernoulli, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// E-Sport series: best-of N maps; each map is first to `roundTarget` round wins
// (win by 2, with overtime beyond the target). scoreA/scoreB are maps won.
export class ESportEngine implements SportEngine {
  readonly sport = SportKey.E_SPORT;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.E_SPORT) {
      throw new Error(`ESportEngine received unsupported sport: ${config.sport}`);
    }
    const opts = (config.options ?? {}) as { bestOf: 1 | 3 | 5; roundTarget?: 13 | 16 };
    const bestOf = opts.bestOf ?? 3;
    const roundTarget = opts.roundTarget ?? 16;
    const mapsToWin = Math.ceil(bestOf / 2);

    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const pA = clamp(normal(0.5, 0.04, rng), 0.3, 0.7);

    const events: SimEvent[] = [];
    const id = createIdFactory('s');

    const mapScores: Array<[number, number]> = [];
    let mapsA = 0;
    let mapsB = 0;
    let mapNum = 1;

    while (mapsA < mapsToWin && mapsB < mapsToWin) {
      let a = 0;
      let b = 0;
      while (true) {
        if (bernoulli(pA, rng)) a++;
        else b++;
        if ((a >= roundTarget || b >= roundTarget) && Math.abs(a - b) >= 2) break;
        if (a > roundTarget + 10 || b > roundTarget + 10) break;
      }
      mapScores.push([a, b]);
      const w: 'A' | 'B' = a > b ? 'A' : 'B';
      if (w === 'A') mapsA++;
      else mapsB++;
      events.push({ id: id(), minute: mapNum, half: 1, kind: 'MAP_WIN', team: w, detail: `Map ${mapNum}: ${teamAName} ${a}-${b} ${teamBName}` });
      mapNum++;
    }

    events.push({ id: id(), minute: mapNum - 1, half: 1, kind: 'MATCH_END', team: mapsA > mapsB ? 'A' : 'B', detail: `Final: ${teamAName} ${mapsA}-${mapsB} ${teamBName}` });

    return {
      sport: this.sport,
      scoreA: mapsA,
      scoreB: mapsB,
      winner: mapsA > mapsB ? 'A' : 'B',
      events,
      metadata: { teamAName, teamBName, mapScores, bestOf, roundTarget },
    };
  }
}
