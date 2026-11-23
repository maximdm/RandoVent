import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { defaultRoster } from '../core/roster';
import { Rng, createRng, poisson, normal, pickInt, pick, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// E-Soccer: virtual football with slightly higher scoring rates than real football.
export class ESoccerEngine implements SportEngine {
  readonly sport = SportKey.E_SOCCER;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.E_SOCCER) {
      throw new Error(`ESoccerEngine received unsupported sport: ${config.sport}`);
    }
    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 11);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 11);

    const lambdaA = clamp(normal(1.8, 0.3, rng), 0.4, 4);
    const lambdaB = clamp(normal(1.6, 0.3, rng), 0.4, 4);

    const events: SimEvent[] = [];
    const id = createIdFactory('e');

    let goalsA = 0;
    let goalsB = 0;

    const addGoals = (team: 'A' | 'B', n: number, teamName: string, roster: string[]) => {
      for (let i = 0; i < n; i++) {
        if (team === 'A') goalsA++;
        else goalsB++;
        const minute = pickInt(1, 90, rng);
        const scorer = pick(roster, rng);
        events.push({
          id: id(),
          minute,
          half: minute <= 45 ? 1 : 2,
          kind: 'GOAL',
          team,
          detail: `${teamName} goal — ${scorer} (${goalsA}-${goalsB})`,
          player: scorer,
        });
      }
    };

    addGoals('A', poisson(lambdaA, rng), teamAName, rosterA);
    addGoals('B', poisson(lambdaB, rng), teamBName, rosterB);

    events.push({ id: id(), minute: 90, half: 2, kind: 'MATCH_END', team: goalsA === goalsB ? null : goalsA > goalsB ? 'A' : 'B', detail: `Final: ${teamAName} ${goalsA}-${goalsB} ${teamBName}` });
    events.sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));

    return {
      sport: this.sport,
      scoreA: goalsA,
      scoreB: goalsB,
      winner: goalsA === goalsB ? 'DRAW' : goalsA > goalsB ? 'A' : 'B',
      events,
      metadata: { teamAName, teamBName, lambdaA: Number(lambdaA.toFixed(2)), lambdaB: Number(lambdaB.toFixed(2)) },
    };
  }
}
