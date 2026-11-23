import { describe, it, expect } from 'vitest';
import { generateLottery, LotteryError } from '../index';

describe('generateLottery', () => {
  it('returns a single hyphen-joined string when sets is 1', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 12345 });
    expect(typeof out).toBe('string');
    const parts = (out as string).split('-');
    expect(parts).toHaveLength(6);
  });

  it('zero-pads to two digits for max <= 99', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 12345 }) as string;
    expect(out).toMatch(/^\d{2}(-\d{2}){5}$/);
  });

  it('zero-pads to three digits for max >= 100', () => {
    const out = generateLottery({ count: 4, min: 1, max: 200, seed: 1 }) as string;
    expect(out).toMatch(/^\d{3}(-\d{3}){3}$/);
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateLottery({ count: 6, min: 1, max: 49, seed: 999 });
    const b = generateLottery({ count: 6, min: 1, max: 49, seed: 999 });
    expect(a).toBe(b);
  });

  it('produces unique numbers when allowDuplicates is false', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 5 }) as string;
    const nums = out.split('-');
    expect(new Set(nums).size).toBe(nums.length);
  });

  it('returns an array of strings when sets > 1', () => {
    const out = generateLottery({ count: 5, min: 1, max: 90, sets: 3, seed: 12345 });
    expect(Array.isArray(out)).toBe(true);
    expect((out as string[])).toHaveLength(3);
  });

  it('throws when count exceeds the unique range', () => {
    expect(() => generateLottery({ count: 50, min: 1, max: 49 })).toThrow(LotteryError);
  });

  it('throws on invalid range', () => {
    expect(() => generateLottery({ count: 1, min: 10, max: 1 })).toThrow(LotteryError);
  });
});
