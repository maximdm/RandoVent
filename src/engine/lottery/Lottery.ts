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
