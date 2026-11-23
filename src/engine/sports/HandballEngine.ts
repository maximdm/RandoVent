import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { defaultRoster } from '../core/roster';
import { Rng, createRng, poisson, normal, bernoulli, pickInt, pick, clamp } from '../core/Distributions';
import { sortEvents } from '../core/events';
import { createIdFactory } from '../core/id';

// Team handball: 2 x 30-min halves (60 min). High-scoring — elite matches average
// ~25–30 goals per team. Goals arrive as Poisson draws; a slice are 7-metre throws
// (handball's penalty) or fast breaks, most are assisted. We also model shots/saves
// (goalkeeper), turnovers, steals, 2-minute suspensions and cards. Handball can end
// level in regular league play, so a tie is a valid DRAW outcome.
export class HandballEngine implements SportEngine {
  readonly sport = SportKey.HANDBALL;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.HANDBALL) {
      throw new Error(`HandballEngine received unsupported sport: ${config.sport}`);
    }
    const rng = createRng(config.seed ?? 0);
    // Separate deterministic stream for flavour events so the scoring RNG sequence
    // (and therefore final scores) is never perturbed by enrichment.
    const frng = createRng(((config.seed ?? 0) ^ 0x85ebca6b) >>> 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 14);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 14);

    const events: SimEvent[] = [];
    const id = createIdFactory('hb');

    // Goal rate per team (~26–27 goals/match at elite level).
    const lambdaA = clamp(normal(27, 4, rng), 14, 45);
    const lambdaB = clamp(normal(26, 4, rng), 14, 45);

    let goalsA = 0;
    let goalsB = 0;

    const halfOf = (minute: number) => (minute <= 30 ? 1 : 2);

    const addGoals = (team: 'A' | 'B', n: number, teamName: string, roster: string[]) => {
      for (let i = 0; i < n; i++) {
        if (team === 'A') goalsA++;
        else goalsB++;
        const minute = pickInt(1, 60, rng);
        const half = halfOf(minute);
        const scorer = pick(roster, rng);
        const is7m = bernoulli(0.18, frng);
        const isBreak = !is7m && bernoulli(0.15, frng);
        const detailTag = is7m ? ' (7m)' : isBreak ? ' (fast break)' : '';
        if (is7m) {
          events.push({
            id: id(),
            minute,
            half,
            kind: 'PENALTY_7M',
            team,
            player: scorer,
            detail: `7m throw — ${teamName} (${scorer})`,
          });
        }
        events.push({
          id: id(),
          minute,
          half,
          kind: 'GOAL',
          team,
          detail: `${teamName} goal${detailTag} (${goalsA}-${goalsB}) — ${scorer}`,
          player: scorer,
        });
        // The scoring attempt is a shot on goal.
        events.push({
          id: id(),
          minute,
          half,
          kind: 'SHOT_ON_GOAL',
          team,
          player: scorer,
          detail: `Shot on goal — ${scorer}`,
        });
        if (isBreak) {
          events.push({
            id: id(),
            minute,
            half,
            kind: 'FAST_BREAK',
            team,
            detail: `Fast break — ${teamName}`,
          });
        }
        if (!is7m && bernoulli(0.55, frng)) {
          const mate = pick(roster, frng);
          if (mate !== scorer) {
            events.push({
              id: id(),
              minute,
              half,
              kind: 'ASSIST',
              team,
              player: mate,
              detail: `Assist — ${mate}`,
            });
          }
        }
      }
    };

    addGoals('A', poisson(lambdaA, rng), teamAName, rosterA);
    addGoals('B', poisson(lambdaB, rng), teamBName, rosterB);

    // Missed shots: extra shot-on-goal attempts saved by the opposing goalkeeper.
    const emitShotsAndSaves = (team: 'A' | 'B', opp: 'A' | 'B', n: number) => {
      const shooters = team === 'A' ? rosterA : rosterB;
      const keepers = opp === 'A' ? rosterA : rosterB;
      for (let i = 0; i < n; i++) {
        const minute = pickInt(1, 60, frng);
        const half = halfOf(minute);
        events.push({
          id: id(),
          minute,
          half,
          kind: 'SHOT_ON_GOAL',
          team,
          player: pick(shooters, frng),
          detail: `Shot on goal — ${pick(shooters, frng)}`,
        });
        events.push({
          id: id(),
          minute,
          half,
          kind: 'SAVE',
          team: opp,
          player: pick(keepers, frng),
          detail: `Save — ${pick(keepers, frng)}`,
        });
      }
    };
    emitShotsAndSaves('A', 'B', Math.round(goalsA * 0.7));
    emitShotsAndSaves('B', 'A', Math.round(goalsB * 0.7));

    // Turnovers, steals, 2-minute suspensions, cards and substitutions (flavour).
    const emitTeamFlavor = (team: 'A' | 'B', teamName: string, roster: string[]) => {
      const half = () => halfOf(pickInt(1, 60, frng));
      const emit = (kind: SportEventKind, n: number, withPlayer: boolean) => {
        for (let i = 0; i < n; i++) {
          events.push({
            id: id(),
            minute: pickInt(1, 60, frng),
            half: half(),
            kind,
            team,
            ...(withPlayer ? { player: pick(roster, frng) } : {}),
            detail: `${teamName} ${kind.toLowerCase().replace(/_/g, ' ')} — ${withPlayer ? pick(roster, frng) : teamName}`,
          });
        }
      };
      emit('TURNOVER', poisson(18, frng), true);
      emit('STEAL', poisson(8, frng), true);
      emit('SUSPENSION', poisson(3, frng), true);
      emit('SUBSTITUTION', poisson(8, frng), true);
      emit('YELLOW_CARD', poisson(1.2, frng), true);
      emit('RED_CARD', poisson(0.2, frng), true);
    };
    emitTeamFlavor('A', teamAName, rosterA);
    emitTeamFlavor('B', teamBName, rosterB);

    let winner: 'A' | 'B' | 'DRAW' = goalsA === goalsB ? 'DRAW' : goalsA > goalsB ? 'A' : 'B';

    events.push({ id: id(), minute: 0, half: 1, kind: 'PERIOD_START', team: null, detail: 'Start of 1st half' });
    events.push({ id: id(), minute: 30, half: 1, kind: 'PERIOD_END', team: null, detail: 'End of 1st half' });
    events.push({ id: id(), minute: 30, half: 2, kind: 'PERIOD_START', team: null, detail: 'Start of 2nd half' });
    events.push({ id: id(), minute: 60, half: 2, kind: 'PERIOD_END', team: null, detail: 'End of 2nd half' });
    events.push({
      id: id(),
      minute: 60,
      half: 2,
      kind: 'MATCH_END',
      team: winner === 'DRAW' ? null : winner,
      detail: `Final: ${teamAName} ${goalsA}-${goalsB} ${teamBName}${winner === 'DRAW' ? ' (draw)' : ''}`,
    });

    sortEvents(events);

    return {
      sport: this.sport,
      scoreA: goalsA,
      scoreB: goalsB,
      winner,
      events,
      metadata: {
        teamAName,
        teamBName,
        lambdaA: Number(lambdaA.toFixed(2)),
        lambdaB: Number(lambdaB.toFixed(2)),
      },
    };
  }
}
