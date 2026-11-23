// Minimal, correct probability helpers for the simulation engine.
// Implements a seeded PRNG (mulberry32) plus Poisson / Normal / weighted sampling.
// This is the starting point for M1; sport-specific models build on top of these.

export type Rng = () => number; // returns a float in [0, 1)

// Deterministic, seedable PRNG. Same seed -> identical sequence (required for
// reproducible bug reports and the determinism guarantee in agents.md §6).
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fresh random 32-bit seed, so callers that omit a seed get a different draw
// every time (matches the match-simulator behaviour).
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

// Poisson sample via Knuth's algorithm (well-suited to the small-to-moderate
// lambda values used across sports, e.g. soccer ~1.1-1.6, hockey ~2.6-3.2).
export function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

// Normal (Gaussian) sample via Box-Muller, scaled to (mean, std).
export function normal(mean = 0, std = 1, rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}

// Weighted pick: returns an index into `weights` proportionally to its value.
export function weightedPick(weights: number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) throw new Error('weightedPick: weights must sum to > 0');
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// Bernoulli trial: returns true with probability p.
export function bernoulli(p: number, rng: Rng): boolean {
  if (p < 0 || p > 1) throw new Error('bernoulli: p must be in [0, 1]');
  return rng() < p;
}

// Uniform integer in [min, max] inclusive.
export function pickInt(min: number, max: number, rng: Rng): number {
  if (max < min) throw new Error('pickInt: max must be >= min');
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick a uniformly random element from a non-empty array.
export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pick: empty array');
  return items[pickInt(0, items.length - 1, rng)];
}

// Clamp a value into [min, max].
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
