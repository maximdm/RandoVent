import { MatchConfig, SportKey } from '../core/MatchConfig';
import { SimEvent, SimResult, SportEventKind } from '../core/EventTypes';
import { SportEngine } from '../core/SportEngine';
import { Rng, createRng, poisson, normal, pickInt, pick, clamp } from '../core/Distributions';
import { createIdFactory } from '../core/id';

// Default roster if none provided: PlayerTeamANo1..NoN (agents.md §3).
function defaultRoster(prefix: 'A' | 'B', size: number): string[] {
  return Array.from({ length: size }, (_, i) => `PlayerTeam${prefix}No${i + 1}`);
}

// Non-goal event types football can produce, with a rough per-match frequency
// (lambda for the Poisson draw) and whether a team is always involved.
const SUPPORT_EVENTS: Array<{ kind: SportEventKind; lambda: number; needsTeam: boolean }> = [
  { kind: 'FOUL', lambda: 11, needsTeam: true },
  { kind: 'CORNER', lambda: 9, needsTeam: true },
  { kind: 'OFFSIDE', lambda: 3, needsTeam: true },
  { kind: 'SAVE', lambda: 4, needsTeam: true },
  { kind: 'YELLOW_CARD', lambda: 3, needsTeam: true },
  { kind: 'SUBSTITUTION', lambda: 3, needsTeam: true },
  { kind: 'RED_CARD', lambda: 0.4, needsTeam: true },
];

function randomMinute(rng: Rng): number {
  // Slightly more events in the second half; clamp to 1..90 plus stoppage.
  const half = rng() < 0.45 ? 1 : 2;
  const base = half === 1 ? pickInt(1, 45, rng) : pickInt(46, 90, rng);
  const stoppage = rng() < 0.1 ? pickInt(1, 5, rng) : 0;
  return clamp(base + (half === 2 ? stoppage : 0), 1, 95);
}

export class FootballEngine implements SportEngine {
  readonly sport = SportKey.FOOTBALL;

  simulate(config: MatchConfig): SimResult {
    if (config.sport !== SportKey.FOOTBALL) {
      throw new Error(`FootballEngine received unsupported sport: ${config.sport}`);
    }
    const rng = createRng(config.seed ?? 0);

    const teamAName = config.participants?.teamAName ?? 'TeamA';
    const teamBName = config.participants?.teamBName ?? 'TeamB';
    const rosterA = config.participants?.teamARoster ?? defaultRoster('A', 11);
    const rosterB = config.participants?.teamBRoster ?? defaultRoster('B', 11);

    // Realistic scoring rates with mild per-seed variation (normal jitter).
    const lambdaA = clamp(normal(1.45, 0.25, rng), 0.4, 3.5);
    const lambdaB = clamp(normal(1.2, 0.25, rng), 0.4, 3.5);

    const events: SimEvent[] = [];
    let scoreA = 0;
    let scoreB = 0;
    const nextId = createIdFactory('f');

    const pushEvent = (
      minute: number,
      kind: SportEventKind,
      team: 'A' | 'B' | null,
      detail: string,
      player?: string,
    ) => {
      const half: 1 | 2 = minute <= 45 ? 1 : 2;
      events.push({ id: nextId(), minute, half, kind, team, player, detail });
    };

    pushEvent(0, 'PERIOD_START', null, 'Kickoff');

    // Goals.
    const goalsA = poisson(lambdaA, rng);
    const goalsB = poisson(lambdaB, rng);
    for (let i = 0; i < goalsA; i++) {
      scoreA++;
      const minute = randomMinute(rng);
      const scorer = pick(rosterA, rng);
      pushEvent(minute, 'GOAL', 'A', `${teamAName} goal — ${scorer} (${scoreA}-${scoreB})`, scorer);
    }
    for (let i = 0; i < goalsB; i++) {
      scoreB++;
      const minute = randomMinute(rng);
      const scorer = pick(rosterB, rng);
      pushEvent(minute, 'GOAL', 'B', `${teamBName} goal — ${scorer} (${scoreA}-${scoreB})`, scorer);
    }

    // Support events.
    for (const def of SUPPORT_EVENTS) {
      const n = poisson(def.lambda, rng);
      for (let i = 0; i < n; i++) {
        const minute = randomMinute(rng);
        const team: 'A' | 'B' = rng() < 0.5 ? 'A' : 'B';
        const roster = team === 'A' ? rosterA : rosterB;
        const name = def.needsTeam ? pick(roster, rng) : undefined;
        const label = def.kind.replace(/_/g, ' ');
        if (def.kind === 'SUBSTITUTION') {
          pushEvent(minute, 'SUBSTITUTION', team, `${team === 'A' ? teamAName : teamBName} substitution — ${name} off/on`, name);
        } else {
          pushEvent(minute, def.kind, team, `${team === 'A' ? teamAName : teamBName} ${label.toLowerCase()} — ${name ?? ''}`.trim(), name);
        }
      }
    }

    pushEvent(90, 'PERIOD_END', null, 'Full time');
    pushEvent(90, 'MATCH_END', null, `Final: ${teamAName} ${scoreA}-${scoreB} ${teamBName}`);

    events.sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));

    const winner: 'A' | 'B' | 'DRAW' =
      scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'DRAW';

    return {
      sport: this.sport,
      scoreA,
      scoreB,
      winner,
      events,
      metadata: {
        teamAName,
        teamBName,
        lambdaA: Number(lambdaA.toFixed(2)),
        lambdaB: Number(lambdaB.toFixed(2)),
        goalsA,
        goalsB,
      },
    };
  }
}
