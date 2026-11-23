import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, normal, bernoulli, pickInt, pick, clamp } from '../core/Distributions';
import { sortEvents } from '../core/events';
import { createIdFactory } from '../core/id';

const FOUL_LIMIT = 5; // personal fouls in a game => player fouls out
const BONUS_THRESHOLD = 5; // team fouls in a quarter => opponent enters the bonus
const FT_RATE = 0.76; // bonus free-throw accuracy

function defaultRoster(prefix: 'A' | 'B', size: number): string[] {
  return Array.from({ length: size }, (_, i) => `PlayerTeam${prefix}No${i + 1}`);
}

// Realistic NBA-style box: 4 quarters, ~27 points/team/quarter at 12 min (scaled
// for 10 min), plus team-foul / bonus / foul-out modeling.
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
    // A separate deterministic stream for flavour events so the scoring RNG
    // sequence (and therefore final scores) is never perturbed by enrichment.
    const frng = createRng(((config.seed ?? 0) ^ 0x9e3779b9) >>> 0);
    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 12);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 12);

    const events: SimEvent[] = [];
    const id = createIdFactory('b');

    let ptsA = 0;
    let ptsB = 0;
    const quarterScores: Array<[number, number]> = [];

    // Personal-foul counts persist across the whole game (NBA), driving foul-outs.
    const foulsA = new Map<string, number>();
    const foulsB = new Map<string, number>();

    const nameOf = (team: 'A' | 'B') => (team === 'A' ? teamAName : teamBName);

    // Author a made basket (2/3) or a made free throw (+1), keeping score in sync.
    const addMade = (team: 'A' | 'B', pts: number, minute: number, player: string) => {
      const kind: SportEventKind = pts === 3 ? 'POINTS_3' : pts === 2 ? 'POINTS_2' : 'FREE_THROW';
      events.push({ id: id(), minute, half: 1, kind, team, player, detail: `${nameOf(team)} +${pts} — ${player}` });
      if (team === 'A') ptsA += pts;
      else ptsB += pts;
      // Most made baskets are assisted — attribute to a random teammate.
      if (pts !== 1 && bernoulli(0.6, frng)) {
        const mate = pick(team === 'A' ? rosterA : rosterB, frng);
        if (mate !== player) {
          events.push({
            id: id(),
            minute,
            half: 1,
            kind: 'ASSIST',
            team,
            player: mate,
            detail: `Assist — ${mate}`,
          });
        }
      }
    };

    // Hustle/defensive events that enrich the feed without changing the score:
    // rebounds, steals, blocks and turnovers, distributed per quarter.
    const emitHustle = (
      team: 'A' | 'B',
      opp: 'A' | 'B',
      roster: string[],
      oppRoster: string[],
      minStart: number,
      minEnd: number,
    ) => {
      const emit = (kind: SportEventKind, t: 'A' | 'B', roster2: string[]) => {
        events.push({
          id: id(),
          minute: pickInt(minStart, minEnd, frng),
          half: 1,
          kind,
          team: t,
          player: pick(roster2, frng),
          detail: `${nameOf(t)} ${kind.toLowerCase().replace(/_/g, ' ')} — ${pick(roster2, frng)}`,
        });
      };
      const n = (mean: number) => Math.max(0, Math.round(normal(mean * scale, mean * 0.3 * scale, frng)));
      for (let i = 0; i < n(10); i++) emit('REBOUND', team, roster);
      for (let i = 0; i < n(7); i++) emit('REBOUND', opp, oppRoster);
      const hustleTeam = () => (bernoulli(0.5, frng) ? team : opp);
      const hustleRoster = (t: 'A' | 'B') => (t === 'A' ? roster : oppRoster);
      for (let i = 0; i < n(4); i++) {
        const t = hustleTeam();
        emit('STEAL', t, hustleRoster(t));
      }
      for (let i = 0; i < n(4); i++) {
        const t = hustleTeam();
        emit('BLOCK', t, hustleRoster(t));
      }
      for (let i = 0; i < n(6); i++) {
        const t = hustleTeam();
        emit('TURNOVER', t, hustleRoster(t));
      }
    };

    // A missed field goal (no points) plus a contesting block chance.
    const addMiss = (team: 'A' | 'B', minute: number, player: string) => {
      events.push({ id: id(), minute, half: 1, kind: 'MISS_SHOT', team, player, detail: `Missed shot — ${player}` });
    };

    const shootFT = (team: 'A' | 'B', minute: number, player: string) => {
      const make = bernoulli(FT_RATE, rng);
      const kind: SportEventKind = make ? 'FREE_THROW' : 'FREE_THROW_MISS';
      events.push({
        id: id(),
        minute,
        half: 1,
        kind,
        team,
        player,
        detail: `${nameOf(team)} FT (${make ? 'made' : 'missed'}) — ${player}`,
      });
      if (make) {
        if (team === 'A') ptsA += 1;
        else ptsB += 1;
      }
    };

    // Break a quarter's field-goal total into made 2/3-pt shots. For each made
    // attempt we also emit a missed shot (misses outnumber makes at ~NBA rates).
    const distributeFG = (total: number, minStart: number, minEnd: number, team: 'A' | 'B', roster: string[]) => {
      let remaining = total;
      while (remaining > 0) {
        let pts: number;
        const r = rng();
        if (remaining === 1) pts = 1;
        else if (r < 0.35) pts = 3;
        else pts = 2;
        if (pts > remaining) pts = remaining; // leftover becomes a free throw
        remaining -= pts;
        const shooter = pick(roster, rng);
        addMade(team, pts, pickInt(minStart, minEnd, rng), shooter);
        if (bernoulli(0.45, frng)) addMiss(team, pickInt(minStart, minEnd, rng), pick(roster, frng));
      }
    };

    // Simulate one team's fouls in a quarter; award bonus FTs to the opponent.
    const simulateFouls = (
      team: 'A' | 'B',
      opp: 'A' | 'B',
      roster: string[],
      oppRoster: string[],
      minStart: number,
      minEnd: number,
    ) => {
      const fouls = team === 'A' ? foulsA : foulsB;
      let teamFouls = 0;
      const n = Math.max(0, Math.round(normal(4.5 * scale, 1.2 * scale, rng)));
      for (let i = 0; i < n; i++) {
        const player = pick(roster, rng);
        teamFouls++;
        const next = (fouls.get(player) ?? 0) + 1;
        fouls.set(player, next);
        const minute = pickInt(minStart, minEnd, rng);
        events.push({
          id: id(),
          minute,
          half: 1,
          kind: 'FOUL',
          team,
          player,
          detail: `${nameOf(team)} foul — ${player} (${next}/${FOUL_LIMIT})`,
        });
        if (next === FOUL_LIMIT) {
          events.push({
            id: id(),
            minute,
            half: 1,
            kind: 'FOUL_OUT',
            team,
            player,
            detail: `${player} fouls out (${FOUL_LIMIT} personal)`,
          });
        }
        if (teamFouls === BONUS_THRESHOLD) {
          events.push({
            id: id(),
            minute,
            half: 1,
            kind: 'BONUS',
            team: opp,
            detail: `${nameOf(opp)} in the bonus`,
          });
        }
        // NBA: from the 5th team foul onward, the opponent shoots two bonus FTs.
        if (teamFouls >= BONUS_THRESHOLD) {
          for (let k = 0; k < 2; k++) {
            shootFT(opp, pickInt(minStart, minEnd, rng), pick(oppRoster, rng));
          }
        }
      }
    };

    let cumA = 0;
    let cumB = 0;
    const recordQuarter = () => {
      quarterScores.push([ptsA - cumA, ptsB - cumB]);
      cumA = ptsA;
      cumB = ptsB;
    };

    let lastMinute = 4 * qLen;
    for (let q = 1; q <= 4; q++) {
      const minStart = (q - 1) * qLen + 1;
      const minEnd = q * qLen;
      distributeFG(Math.max(0, Math.round(normal(27 * scale, 6 * scale, rng))), minStart, minEnd, 'A', rosterA);
      distributeFG(Math.max(0, Math.round(normal(27 * scale, 6 * scale, rng))), minStart, minEnd, 'B', rosterB);
      simulateFouls('A', 'B', rosterA, rosterB, minStart, minEnd);
      simulateFouls('B', 'A', rosterB, rosterA, minStart, minEnd);
      emitHustle('A', 'B', rosterA, rosterB, minStart, minEnd);
      emitHustle('B', 'A', rosterB, rosterA, minStart, minEnd);
      events.push({ id: id(), minute: minEnd, half: 1, kind: 'QUARTER_END', team: null, detail: `End of Q${q}` });
      recordQuarter();
    }

    // Overtime if tied after regulation — repeat 5-min OT periods until a winner.
    let otStart = 4 * qLen;
    let otPeriod = 1;
    while (ptsA === ptsB && otPeriod <= 6) {
      const otLen = 5;
      const minStart = otStart + 1;
      const minEnd = otStart + otLen;
      distributeFG(Math.max(0, Math.round(normal(6 * (otLen / 12) * scale, 2 * (otLen / 12) * scale, rng))), minStart, minEnd, 'A', rosterA);
      distributeFG(Math.max(0, Math.round(normal(6 * (otLen / 12) * scale, 2 * (otLen / 12) * scale, rng))), minStart, minEnd, 'B', rosterB);
      simulateFouls('A', 'B', rosterA, rosterB, minStart, minEnd);
      simulateFouls('B', 'A', rosterB, rosterA, minStart, minEnd);
      emitHustle('A', 'B', rosterA, rosterB, minStart, minEnd);
      emitHustle('B', 'A', rosterB, rosterA, minStart, minEnd);
      events.push({ id: id(), minute: minEnd, half: 1, kind: 'OVERTIME', team: null, detail: `End of OT${otPeriod}` });
      recordQuarter();
      lastMinute = minEnd;
      otStart += otLen;
      otPeriod++;
    }

    sortEvents(events);

    const winner: 'A' | 'B' | 'DRAW' = ptsA > ptsB ? 'A' : ptsB > ptsA ? 'B' : 'DRAW';
    events.push({
      id: id(),
      minute: lastMinute,
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
      metadata: {
        teamAName,
        teamBName,
        quarterLength: qLen,
        quarterScores,
        totalA: ptsA,
        totalB: ptsB,
        foulLimit: FOUL_LIMIT,
        bonusThreshold: BONUS_THRESHOLD,
      },
    };
  }
}
