import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { defaultRoster } from '../core/roster';
import { Rng, createRng, poisson, normal, bernoulli, pickInt, pick, clamp } from '../core/Distributions';
import { sortEvents } from '../core/events';
import { createIdFactory } from '../core/id';

// NHL-style: 3 x 20-min periods, Poisson goals (~2.6-2.8/team), penalties.
export class HockeyEngine implements SportEngine {
  readonly sport = SportKey.HOCKEY;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.HOCKEY) {
      throw new Error(`HockeyEngine received unsupported sport: ${config.sport}`);
    }
    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 18);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 18);

    const events: SimEvent[] = [];
    const id = createIdFactory('h');

    const lambdaA = clamp(normal(2.8, 0.5, rng), 0.5, 6);
    const lambdaB = clamp(normal(2.6, 0.5, rng), 0.5, 6);
    const pShootout = clamp(normal(0.5, 0.03, rng), 0.3, 0.7);

    let goalsA = 0;
    let goalsB = 0;

    const addGoals = (team: 'A' | 'B', n: number, teamName: string, roster: string[]) => {
      for (let i = 0; i < n; i++) {
        if (team === 'A') goalsA++;
        else goalsB++;
        const minute = pickInt(1, 60, rng);
        const period = Math.min(3, Math.ceil(minute / 20));
        const scorer = pick(roster, rng);
        events.push({
          id: id(),
          minute,
          half: period,
          kind: 'GOAL',
          team,
          detail: `${teamName} goal (P${period}) — ${scorer} (${goalsA}-${goalsB})`,
          player: scorer,
        });
      }
    };

    addGoals('A', poisson(lambdaA, rng), teamAName, rosterA);
    addGoals('B', poisson(lambdaB, rng), teamBName, rosterB);

    // Penalties.
    for (const [team, teamName, roster] of [
      ['A', teamAName, rosterA],
      ['B', teamBName, rosterB],
    ] as const) {
      const n = poisson(3, rng);
      for (let i = 0; i < n; i++) {
        const minute = pickInt(1, 60, rng);
        const player = pick(roster, rng);
        events.push({
          id: id(),
          minute,
          half: Math.min(3, Math.ceil(minute / 20)),
          kind: 'PENALTY' as SportEventKind,
          team,
          player,
          detail: `${teamName} penalty — ${player}`,
        });
      }
    }

    // Shootout if tied after regulation (M6 edge case) — never a draw.
    let winner: 'A' | 'B' | 'DRAW' = goalsA === goalsB ? 'DRAW' : goalsA > goalsB ? 'A' : 'B';
    if (goalsA === goalsB) {
      let sa = 0;
      let sb = 0;
      for (let i = 0; i < 5; i++) {
        if (bernoulli(pShootout, rng)) sa++;
        if (bernoulli(pShootout, rng)) sb++;
      }
      let round = 5;
      while (sa === sb) {
        round++;
        if (bernoulli(pShootout, rng)) sa++;
        if (bernoulli(pShootout, rng)) sb++;
      }
      winner = sa > sb ? 'A' : 'B';
      events.push({ id: id(), minute: 60, half: 3, kind: 'SHOOTOUT', team: winner, detail: `Shootout ${sa}-${sb} (${winner === 'A' ? teamAName : teamBName} wins)` });
    }

    for (const m of [20, 40, 60]) {
      events.push({ id: id(), minute: m, half: m / 20, kind: 'PERIOD_END', team: null, detail: `End of period ${m / 20}` });
    }
    events.push({ id: id(), minute: 60, half: 3, kind: 'MATCH_END', team: winner === 'DRAW' ? null : winner, detail: `Final: ${teamAName} ${goalsA}-${goalsB} ${teamBName}` });

    sortEvents(events);

    return {
      sport: this.sport,
      scoreA: goalsA,
      scoreB: goalsB,
      winner,
      events,
      metadata: { teamAName, teamBName, lambdaA: Number(lambdaA.toFixed(2)), lambdaB: Number(lambdaB.toFixed(2)) },
    };
  }
}
