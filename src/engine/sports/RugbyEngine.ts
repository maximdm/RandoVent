import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { defaultRoster } from '../core/roster';
import { Rng, createRng, poisson, bernoulli, pickInt, pick, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// Rugby Union / League: tries (+conversions) and penalty/drop goals.
// Union: try 5, conversion 2, penalty 3, drop goal 3.
// League: try 4, conversion 2, penalty 2, drop goal 1.
export class RugbyEngine implements SportEngine {
  readonly sport = SportKey.RUGBY;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.RUGBY) {
      throw new Error(`RugbyEngine received unsupported sport: ${config.sport}`);
    }
    const opts = (config.options ?? {}) as { code: 'UNION' | 'LEAGUE' };
    const code = opts.code ?? 'UNION';
    const tryPts = code === 'UNION' ? 5 : 4;
    const convPts = 2;
    const penPts = code === 'UNION' ? 3 : 2;
    const dropPts = code === 'UNION' ? 3 : 1;

    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 15);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 15);

    const events: SimEvent[] = [];
    const id = createIdFactory('r');

    let ptsA = 0;
    let ptsB = 0;

    const scoreTeam = (team: 'A' | 'B', teamName: string, roster: string[], triesLambda: number, pensLambda: number, dropsLambda: number) => {
      let pts = 0;
      const add = (kind: SportEventKind, p: number, player?: string) => {
        const minute = pickInt(1, 80, rng);
        // Rugby has two 40-minute halves.
        const half: 1 | 2 = minute <= 40 ? 1 : 2;
        pts += p;
        events.push({ id: id(), minute, half, kind, team, detail: `${teamName} +${p}${player ? ` — ${player}` : ''}`, player });
      };
      // Caps keep extreme Poisson tails realistic: a team scoring 8+ tries or 6+
      // penalties in a single match is essentially unheard of, so we bound them.
      const tries = Math.min(poisson(triesLambda, rng), 7);
      for (let i = 0; i < tries; i++) {
        const scorer = pick(roster, rng);
        add('TRY', tryPts, scorer);
        if (bernoulli(0.78, rng)) add('CONVERSION', convPts);
      }
      const pens = Math.min(poisson(pensLambda, rng), 5);
      for (let i = 0; i < pens; i++) add('PENALTY_GOAL', penPts);
      const drops = Math.min(poisson(dropsLambda, rng), 2);
      for (let i = 0; i < drops; i++) add('DROP_GOAL', dropPts);
      return pts;
    };

    // Union: ~2.7–2.9 tries + ~1.8–1.9 penalties + occasional drop goals per team →
    // a realistic total in the high-40s to mid-50s. League is try-heavy, penalty-light.
    ptsA = scoreTeam('A', teamAName, rosterA, code === 'UNION' ? 2.9 : 3.6, code === 'UNION' ? 1.9 : 1.6, code === 'UNION' ? 0.35 : 0.3);
    ptsB = scoreTeam('B', teamBName, rosterB, code === 'UNION' ? 2.7 : 3.4, code === 'UNION' ? 1.8 : 1.5, code === 'UNION' ? 0.35 : 0.3);

    // Set-piece and contact flavour (no score impact).
    const emitRugbyFlavor = (team: 'A' | 'B', teamName: string, roster: string[]) => {
      const emit = (kind: SportEventKind, n: number) => {
        for (let i = 0; i < n; i++) {
          events.push({
            id: id(),
            minute: pickInt(1, 80, rng),
            half: halfPeriod(),
            kind,
            team,
            player: pick(roster, rng),
            detail: `${teamName} ${kind.toLowerCase().replace(/_/g, ' ')} — ${pick(roster, rng)}`,
          });
        }
      };
      emit('TACKLE', poisson(45, rng));
      emit('SCRUM', poisson(12, rng));
      emit('LINEOUT', poisson(14, rng));
      emit('KNOCK_ON', poisson(3, rng));
    };
    const halfPeriod = (): 1 | 2 => (rng() < 0.5 ? 1 : 2);
    emitRugbyFlavor('A', teamAName, rosterA);
    emitRugbyFlavor('B', teamBName, rosterB);

    events.push({ id: id(), minute: 80, half: 1, kind: 'MATCH_END', team: ptsA === ptsB ? null : ptsA > ptsB ? 'A' : 'B', detail: `Final: ${teamAName} ${ptsA}-${ptsB} ${teamBName}` });

    return {
      sport: this.sport,
      scoreA: ptsA,
      scoreB: ptsB,
      winner: ptsA === ptsB ? 'DRAW' : ptsA > ptsB ? 'A' : 'B',
      events,
      metadata: { teamAName, teamBName, code, tryPts, convPts, penPts, dropPts },
    };
  }
}
