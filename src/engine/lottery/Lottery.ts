import { LotteryConfig } from '../core/MatchConfig';
import { Rng, createRng, pickInt, randomSeed } from '../core/Distributions';

// Typed error for invalid lottery configuration (agents.md §7).
export class LotteryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LotteryError';
  }
}

// Zero-pad width based on the max value: <= 99 -> 2 digits, >= 100 -> 3 digits.
function padWidth(max: number): number {
  return max >= 100 ? 3 : 2;
}

function drawSet(rng: Rng, config: Required<Omit<LotteryConfig, 'seed'>>): string {
  const { count, min, max, allowDuplicates, sorted } = config;
  const pad = (n: number) => String(n).padStart(padWidth(max), '0');
  const nums: number[] = [];

  if (allowDuplicates) {
    for (let i = 0; i < count; i++) nums.push(pickInt(min, max, rng));
  } else {
    // Build the full pool once and Fisher-Yates shuffle it with the seeded RNG,
    // then take the first `count` values (guarantees uniqueness).
    const pool: number[] = [];
    for (let v = min; v <= max; v++) pool.push(v);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = pickInt(0, i, rng);
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    for (let i = 0; i < count; i++) nums.push(pool[i]);
  }

  if (sorted) nums.sort((a, b) => a - b);
  return nums.map(pad).join('-');
}

// Generates one or more lottery tickets.
// Returns a single hyphen-joined string when `sets === 1`, otherwise string[].
export function generateLottery(config: LotteryConfig): string | string[] {
  const { count, min, max, allowDuplicates = false, sorted = true, sets = 1, seed } = config;

  if (!Number.isInteger(count) || count < 1) throw new LotteryError('count must be an integer >= 1');
  if (min > max) throw new LotteryError('min must be <= max');
  if (!Number.isInteger(sets) || sets < 1) throw new LotteryError('sets must be an integer >= 1');

  const range = max - min + 1;
  if (!allowDuplicates && count > range) {
    throw new LotteryError(`count (${count}) exceeds the unique range size (${range}); enable allowDuplicates or reduce count`);
  }

  const normalized: Required<Omit<LotteryConfig, 'seed'>> = {
    count,
    min,
    max,
    allowDuplicates,
    sorted,
    sets,
  };

  const rng = createRng(seed ?? randomSeed());
  const results: string[] = [];
  for (let s = 0; s < sets; s++) results.push(drawSet(rng, normalized));

  return sets === 1 ? results[0] : results;
}

// Splits a hyphen-joined number string ("03-12-27") into integers.
// Tolerates stray spaces and non-numeric tokens (which are ignored).
export function parseNumbers(s: string): number[] {
  return s
    .split('-')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && /^\d+$/.test(t))
    .map((t) => parseInt(t, 10));
}

// Draws a single "winning" combination under the same conditions as a ticket.
// Uses an explicit (or fresh random) seed so it's reproducible if desired.
export function drawWinning(config: LotteryConfig, seed?: number): string {
  const { count, min, max, allowDuplicates = false, sorted = true } = config;
  if (!Number.isInteger(count) || count < 1) throw new LotteryError('count must be an integer >= 1');
  if (min > max) throw new LotteryError('min must be <= max');
  const range = max - min + 1;
  if (!allowDuplicates && count > range) {
    throw new LotteryError(`count (${count}) exceeds the unique range size (${range})`);
  }
  const normalized: Required<Omit<LotteryConfig, 'seed'>> = {
    count,
    min,
    max,
    allowDuplicates,
    sorted,
    sets: 1,
  };
  return drawSet(createRng(seed ?? randomSeed()), normalized);
}

// Counts how many entries of `mine` also appear in `winning`, counting each value
// as many times as it occurs in both (so duplicates are matched as a multiset).
export function countMatches(mine: string, winning: string): number {
  const a = parseNumbers(mine);
  const b = parseNumbers(winning);
  const counts = new Map<number, number>();
  for (const n of b) counts.set(n, (counts.get(n) ?? 0) + 1);
  let matched = 0;
  for (const n of a) {
    const c = counts.get(n) ?? 0;
    if (c > 0) {
      matched += 1;
      counts.set(n, c - 1);
    }
  }
  return matched;
}

export interface CheckResult {
  matches: number;
  total: number;
  winning: string;
}

// Convenience: draws a winning combination for the supplied config and reports
// how many of the player's numbers matched it.
export function checkMyNumbers(numbers: string, config: LotteryConfig, seed?: number): CheckResult {
  const winning = drawWinning(config, seed);
  return {
    matches: countMatches(numbers, winning),
    total: parseNumbers(numbers).length,
    winning,
  };
}
