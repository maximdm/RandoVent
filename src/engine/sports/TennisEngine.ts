import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, bernoulli, clamp } from '../core/Distributions';

// Realistic-ish tennis model: best-of sets, each game won by A with probability
// pA (seed-jittered around ~0.54). Sets use standard 6-game / win-by-2 rules with
// a 7-point tiebreak at 6-6.
export class TennisEngine implements SportEngine {
  readonly sport = SportKey.TENNIS;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.TENNIS) {
      throw new Error(`TennisEngine received unsupported sport: ${config.sport}`);
    }
    const opts = config.options as { matchFormat: 'BO3' | 'BO5' };
    const bestOf = opts.matchFormat === 'BO5' ? 5 : 3;
    const setsToWin = Math.ceil(bestOf / 2);

    const rng = createRng(config.seed ?? 0);
    const playerA = config.participants?.playerAName ?? 'Player A';
    const playerB = config.participants?.playerBName ?? 'Player B';
    const pA = clamp(normal(0.54, 0.03, rng), 0.35, 0.75);

    const events: SimEvent[] = [];
    let counter = 0;
    const id = () => `t${counter++}`;

    const setScores: Array<[number, number]> = [];
    let setsA = 0;
    let setsB = 0;
    let setNum = 1;

    while (setsA < setsToWin && setsB < setsToWin) {
      let gA = 0;
      let gB = 0;
      let tiebreak = false;

      while (true) {
        if (bernoulli(pA, rng)) gA++;
        else gB++;

        if ((gA >= 6 || gB >= 6) && Math.abs(gA - gB) >= 2) break;
        if (gA === 7 || gB === 7) break;
        if (gA >= 6 && gB >= 6) {
          // Tiebreak: first to 7, win by 2.
          let tA = 0;
          let tB = 0;
          while (true) {
            if (bernoulli(pA, rng)) tA++;
            else tB++;
            if ((tA >= 7 || tB >= 7) && Math.abs(tA - tB) >= 2) break;
          }
          if (tA > tB) gA = 7;
          else gB = 7;
          tiebreak = true;
          break;
        }
      }

      setScores.push([gA, gB]);
      const setWinner: 'A' | 'B' = gA > gB ? 'A' : 'B';
      if (setWinner === 'A') setsA++;
      else setsB++;

      const detail = `Set ${setNum}: ${playerA} ${gA}-${gB} ${playerB} (${setWinner === 'A' ? playerA : playerB} wins)`;
      events.push({ id: id(), minute: setNum, half: 1, kind: 'SET_WIN', team: setWinner, detail });
      if (tiebreak) {
        events.push({ id: id(), minute: setNum, half: 1, kind: 'TIEBREAK', team: null, detail: `Tiebreak decided set ${setNum}` });
      }
      setNum++;
    }

    const winner: 'A' | 'B' = setsA > setsB ? 'A' : 'B';
    events.push({
      id: id(),
      minute: setNum - 1,
      half: 1,
      kind: 'MATCH_END',
      team: winner,
      detail: `Final: ${playerA} ${setsA}-${setsB} ${playerB}`,
    });

    return {
      sport: this.sport,
      scoreA: setsA,
      scoreB: setsB,
      winner,
      events,
      metadata: { playerA, playerB, pA: Number(pA.toFixed(3)), setScores, matchFormat: opts.matchFormat },
    };
  }
}
