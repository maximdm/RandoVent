import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { defaultRoster } from '../core/roster';
import { Rng, createRng, normal, bernoulli, pick, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// Rally scoring: sets to 25 (win by 2), deciding set to 15. BO3 / BO5.
export class VolleyballEngine implements SportEngine {
  readonly sport = SportKey.VOLLEYBALL;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.VOLLEYBALL) {
      throw new Error(`VolleyballEngine received unsupported sport: ${config.sport}`);
    }
    const opts = (config.options ?? {}) as { sets: 'BO3' | 'BO5' };
    const bestOf = opts.sets === 'BO5' ? 5 : 3;
    const setsToWin = Math.ceil(bestOf / 2);

    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 12);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 12);
    const pA = clamp(normal(0.5, 0.04, rng), 0.3, 0.7);

    const events: SimEvent[] = [];
    const id = createIdFactory('v');

    const setScores: Array<[number, number]> = [];
    let setsA = 0;
    let setsB = 0;
    let setNum = 1;

    while (setsA < setsToWin && setsB < setsToWin) {
      const deciding = setsA + setsB === bestOf - 1;
      const target = deciding ? 15 : 25;
      let a = 0;
      let b = 0;
      let deuceEmitted = false;
      // Simulate rally by rally; cap defensively at target + 10 to guarantee termination.
      while (true) {
        const team: 'A' | 'B' = bernoulli(pA, rng) ? 'A' : 'B';
        if (team === 'A') a++;
        else b++;
        const scorer = pick(team === 'A' ? rosterA : rosterB, rng);
        events.push({
          id: id(),
          minute: setNum,
          half: 1,
          kind: 'POINT' as SportEventKind,
          team,
          player: scorer,
          detail: `Point — ${team === 'A' ? teamAName : teamBName} (${scorer}) ${a}-${b}`,
        });
        // Deuce: both teams at set point and tied (24-24 or 14-14) — emit once.
        if (!deuceEmitted && a === target - 1 && b === target - 1) {
          events.push({ id: id(), minute: setNum, half: 1, kind: 'DEUCE', team: null, detail: `Deuce in set ${setNum} (${a}-${b})` });
          deuceEmitted = true;
        }
        if ((a >= target || b >= target) && Math.abs(a - b) >= 2) break;
        if (a > target + 10 || b > target + 10) break;
      }
      setScores.push([a, b]);
      const w: 'A' | 'B' = a > b ? 'A' : 'B';
      if (w === 'A') setsA++;
      else setsB++;
      events.push({ id: id(), minute: setNum, half: 1, kind: 'SET_WIN', team: w, detail: `Set ${setNum}: ${teamAName} ${a}-${b} ${teamBName} (${w === 'A' ? teamAName : teamBName} wins)` });
      setNum++;
    }

    events.push({ id: id(), minute: setNum - 1, half: 1, kind: 'MATCH_END', team: setsA > setsB ? 'A' : 'B', detail: `Final: ${teamAName} ${setsA}-${setsB} ${teamBName}` });

    return {
      sport: this.sport,
      scoreA: setsA,
      scoreB: setsB,
      winner: setsA > setsB ? 'A' : 'B',
      events,
      metadata: { teamAName, teamBName, setScores, sets: opts.sets },
    };
  }
}
