import { describe, it, expect } from 'vitest';
import { createRng, poisson, normal, weightedPick } from '../Distributions';

describe('createRng (seeded PRNG)', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toEqual(b());
  });

  it('returns values within [0, 1)', () => {
    const r = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('poisson', () => {
  it('returns a non-negative integer', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = poisson(1.5, r);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('mean approximates lambda over many samples', () => {
    const r = createRng(99);
    const n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += poisson(1.5, r);
    const mean = sum / n;
    expect(mean).toBeGreaterThan(1.3);
    expect(mean).toBeLessThan(1.7);
  });
});

describe('normal', () => {
  it('mean approximates 0 and std approximates 1 over many samples', () => {
    const r = createRng(2024);
    const n = 50000;
    let sum = 0;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = normal(0, 1, r);
      xs.push(x);
      sum += x;
    }
    const mean = sum / n;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    expect(mean).toBeGreaterThan(-0.05);
    expect(mean).toBeLessThan(0.05);
    expect(std).toBeGreaterThan(0.95);
    expect(std).toBeLessThan(1.05);
  });
});

describe('weightedPick', () => {
  it('always returns a valid index', () => {
    const r = createRng(5);
    const weights = [1, 3, 6];
    for (let i = 0; i < 1000; i++) {
      const idx = weightedPick(weights, r);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(weights.length);
    }
  });

  it('favours heavier weights proportionally over many samples', () => {
    const r = createRng(11);
    const weights = [1, 9]; // ~10% vs ~90%
    const n = 20000;
    let second = 0;
    for (let i = 0; i < n; i++) if (weightedPick(weights, r) === 1) second++;
    const frac = second / n;
    expect(frac).toBeGreaterThan(0.85);
    expect(frac).toBeLessThan(0.95);
  });

  it('throws on non-positive total weight', () => {
    const r = createRng(1);
    expect(() => weightedPick([0, 0], r)).toThrow();
  });
});
