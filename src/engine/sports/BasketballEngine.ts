import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, pickInt, pick, clamp } from '../core/Distributions';
import { sortEvents } from '../core/events';
import { createIdFactory } from '../core/id';

function defaultRoster(prefix: 'A' | 'B', size: number): string[] {
  return Array.from({ length: size }, (_, i) => `PlayerTeam${prefix}No${i + 1}`);
}

// Break a quarter's point total into individual made-shot events (2PT / 3PT / FT),
// each attributed to a random roster player at a random minute in the quarter.
function distributePoints(
  events: SimEvent[],
  total: number,
  minStart: number,
  minEnd: number,
  team: 'A' | 'B',
  teamName: string,
  roster: string[],
  rng: Rng,
  id: () => string,
): void {
  let remaining = total;
  while (remaining > 0) {
    let pts: number;
    const r = rng();
    if (remaining === 1) pts = 1;
    else if (r < 0.35) pts = 3;
    else pts = 2;
    if (pts > remaining) pts = remaining; // leftover becomes free throws
    remaining -= pts;

    const minute = pickInt(minStart, minEnd, rng);
    const player = pick(roster, rng);
    const kind: SportEventKind = pts === 3 ? 'POINTS_3' : pts === 2 ? 'POINTS_2' : 'FREE_THROW';
    events.push({ id: id(), minute, half: 1, kind, team, detail: `${teamName} +${pts} — ${player}` });
  }
}

// Realistic NBA-style box: 4 quarters, ~27 points/team/quarter at 12 min, scaled for 10 min.
export class BasketballEngine implements SportEngine {
  readonly sport = SportKey.BASKETBALL;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.BASKETBALL) {
      throw new Error(`BasketballEngine received unsupported sport: ${config.sport}`);
    }
    const opts = config.options as { quarterLength: 10 | 12 };
    const qLen = opts.quarterLength ?? 12;
    const scale = qLen / 12;

    const rng = createRng(config.seed ?? 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 12);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 12);

    const events: SimEvent[] = [];
    const id = createIdFactory('b');

    let ptsA = 0;
    let ptsB = 0;
    const quarterScores: Array<[number, number]> = [];

    for (let q = 1; q <= 4; q++) {
      const qA = Math.max(0, Math.round(normal(27 * scale, 6 * scale, rng)));
      const qB = Math.max(0, Math.round(normal(27 * scale, 6 * scale, rng)));
      ptsA += qA;
      ptsB += qB;
      quarterScores.push([qA, qB]);

      distributePoints(events, qA, (q - 1) * qLen + 1, q * qLen, 'A', teamAName, rosterA, rng, id);
      distributePoints(events, qB, (q - 1) * qLen + 1, q * qLen, 'B', teamBName, rosterB, rng, id);
      events.push({ id: id(), minute: q * qLen, half: 1, kind: 'QUARTER_END', team: null, detail: `End of Q${q}` });
    }

    // Overtime if tied after regulation (M6 edge case) — repeat 5-min OT periods
    // until a winner emerges (with a safety cap to guarantee termination).
    let otStart = 4 * qLen;
    let otPeriod = 1;
    while (ptsA === ptsB && otPeriod <= 6) {
      const otLen = 5;
      const oA = Math.max(0, Math.round(normal(6 * (otLen / 12), 2 * (otLen / 12), rng)));
      const oB = Math.max(0, Math.round(normal(6 * (otLen / 12), 2 * (otLen / 12), rng)));
      ptsA += oA;
      ptsB += oB;
      distributePoints(events, oA, otStart + 1, otStart + otLen, 'A', teamAName, rosterA, rng, id);
      distributePoints(events, oB, otStart + 1, otStart + otLen, 'B', teamBName, rosterB, rng, id);
      events.push({ id: id(), minute: otStart + otLen, half: 1, kind: 'OVERTIME', team: null, detail: `End of OT${otPeriod}` });
      otStart += otLen;
      otPeriod++;
    }

    sortEvents(events);

    const winner: 'A' | 'B' | 'DRAW' = ptsA > ptsB ? 'A' : ptsB > ptsA ? 'B' : 'DRAW';
    events.push({
      id: id(),
      minute: 4 * qLen,
      half: 1,
      kind: 'MATCH_END',
      team: winner === 'DRAW' ? null : winner,
      detail: `Final: ${teamAName} ${ptsA}-${ptsB} ${teamBName}`,
    });

    return {
      sport: this.sport,
      scoreA: ptsA,
      scoreB: ptsB,
      winner,
      events,
      metadata: { teamAName, teamBName, quarterLength: qLen, quarterScores, totalA: ptsA, totalB: ptsB },
    };
  }
}
