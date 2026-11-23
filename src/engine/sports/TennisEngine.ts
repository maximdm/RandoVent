import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, bernoulli, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

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
    const id = createIdFactory('t');

    const setScores: Array<[number, number]> = [];
    let setsA = 0;
    let setsB = 0;
    let setNum = 1;

    while (setsA < setsToWin && setsB < setsToWin) {
      let gA = 0;
      let gB = 0;
      let tiebreak = false;
      // Serve alternates each game (standard tennis). A game won by the returner
      // is a service break.
      let server: 'A' | 'B' = 'A';

      while (true) {
        const winner: 'A' | 'B' = bernoulli(pA, rng) ? 'A' : 'B';
        if (winner !== server) {
          events.push({
            id: id(),
            minute: setNum,
            half: setNum,
            kind: 'BREAK',
            team: winner,
            detail: `Service break — ${winner === 'A' ? playerA : playerB}`,
          });
        }
        if (winner === 'A') gA++;
        else gB++;

        // Deuce: both players at 40 (3 games/points each) — emit each time the
        // score returns to equality from 3 upward.
        if (gA === gB && gA >= 3) {
          events.push({ id: id(), minute: setNum, half: setNum, kind: 'DEUCE', team: null, detail: `Deuce in set ${setNum}` });
        }

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
        // Alternate serve for the next game.
        server = server === 'A' ? 'B' : 'A';
      }

      setScores.push([gA, gB]);
      const setWinner: 'A' | 'B' = gA > gB ? 'A' : 'B';
      if (setWinner === 'A') setsA++;
      else setsB++;

      // Enrich the feed with point-level flavour for the deciding game: aces,
      // double faults, winners and unforced errors (no effect on the score).
      const winnerName = setWinner === 'A' ? playerA : playerB;
      const loserName = setWinner === 'A' ? playerB : playerA;
      for (let i = 0; i < 3; i++) {
        const r = rng();
        if (r < 0.2) {
          events.push({ id: id(), minute: setNum, half: setNum, kind: 'ACE', team: setWinner, detail: `Ace — ${winnerName}` });
        } else if (r < 0.35) {
          events.push({ id: id(), minute: setNum, half: setNum, kind: 'DOUBLE_FAULT', team: setWinner === 'A' ? 'B' : 'A', detail: `Double fault — ${loserName}` });
        } else if (r < 0.6) {
          events.push({ id: id(), minute: setNum, half: setNum, kind: 'WINNER', team: setWinner, detail: `Winner — ${winnerName}` });
        } else if (r < 0.8) {
          events.push({ id: id(), minute: setNum, half: setNum, kind: 'UNFORCED_ERROR', team: setWinner === 'A' ? 'B' : 'A', detail: `Unforced error — ${loserName}` });
        }
      }
      if (bernoulli(0.5, rng)) {
        events.push({ id: id(), minute: setNum, half: setNum, kind: 'BREAK_POINT', team: setWinner, detail: `Break point saved/converted — ${winnerName}` });
      }

      const detail = `Set ${setNum}: ${playerA} ${gA}-${gB} ${playerB} (${setWinner === 'A' ? playerA : playerB} wins)`;
      events.push({ id: id(), minute: setNum, half: setNum, kind: 'SET_WIN', team: setWinner, detail });
      if (tiebreak) {
        events.push({ id: id(), minute: setNum, half: setNum, kind: 'TIEBREAK', team: null, detail: `Tiebreak decided set ${setNum}` });
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
